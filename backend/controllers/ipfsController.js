// backend/controllers/ipfsController.js
const pinataSDK = require('@pinata/sdk');
const CertificateRequest = require('../models/CertificateRequest');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs'); // For temporary file handling if needed, though we'll use buffers
const path = require('path');

// Initialize Pinata SDK
const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY,
});

// Helper function to embed QR code into a PDF
async function embedQrCodeInPdf(pdfBuffer, qrContent) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0]; // Embed QR code on the first page

  // Generate QR code as a PNG buffer
  const qrCodeImageBuffer = await QRCode.toBuffer(qrContent, { type: 'png', errorCorrectionLevel: 'H', scale: 4 });
  const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBuffer);

  const qrSize = 100; // Size of the QR code image in PDF points (1 point = 1/72 inch)
  const margin = 30; // Margin from the top and right edges

  const { width, height } = firstPage.getSize();

  // Position the QR code in the bottom-right corner
  firstPage.drawImage(qrCodeImage, {
    x: width - qrSize - margin,
    y: margin, // Changed y-coordinate to position at the bottom
    width: qrSize,
    height: qrSize,
  });

  return await pdfDoc.save(); // Returns a Uint8Array of the modified PDF
}

// @desc    Uploads a document to IPFS, embeds QR code, and updates request status
// @route   POST /api/ipfs/upload-document/:requestId
// @access  Private (Organization only)
const uploadDocument = async (req, res) => {
  try {
    // Check if user is authenticated and is an organization (middleware handles this)
    if (req.user.userType !== 'organization') {
      return res.status(403).json({ message: 'Access denied. Only organizations can upload documents.' });
    }

    const requestId = req.params.requestId;
    const documentFile = req.file; // The uploaded PDF file buffer

    if (!documentFile) {
      return res.status(400).json({ message: 'No document file uploaded.' });
    }

    // 1. Get the request details to link the document to the correct student/org
    const certificateRequest = await CertificateRequest.findById(requestId);
    if (!certificateRequest) {
      return res.status(404).json({ message: 'Certificate request not found.' });
    }

    // Ensure the organization uploading is the one associated with the request
    if (certificateRequest.organization.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only upload documents for your own requests.' });
    }

    // 2. Upload the original PDF to Pinata first
    const originalPdfReadableStream = require('stream').Readable.from(documentFile.buffer);
    originalPdfReadableStream.path = documentFile.originalname; // Set a filename for Pinata
    const originalPinataResult = await pinata.pinFileToIPFS(originalPdfReadableStream, {
      pinataMetadata: {
        name: `deCertify-Original-Certificate-${requestId}`,
        keyvalues: {
          requestId: requestId,
          organizationId: req.user.id,
          studentId: certificateRequest.student.toString(),
          type: 'original_certificate',
        },
      },
    });
    const originalPdfIpfsHash = originalPinataResult.IpfsHash;
    console.log('Original PDF uploaded to IPFS:', originalPdfIpfsHash);

    // 3. Generate QR code content (this will be the URL to the original PDF)
    const qrContent = `https://gateway.pinata.cloud/ipfs/${originalPdfIpfsHash}`;
    console.log('QR Code Content for embedding:', qrContent);

    // 4. Embed QR code into the PDF
    const embeddedPdfUint8Array = await embedQrCodeInPdf(documentFile.buffer, qrContent);
    console.log('QR code embedded into PDF.');

    // 5. Upload the QR-embedded PDF to Pinata
    // Convert Uint8Array to Node.js Buffer
    const embeddedPdfBuffer = Buffer.from(embeddedPdfUint8Array);
    // Create a readable stream from the Buffer and assign a path
    const embeddedPdfReadableStream = require('stream').Readable.from(embeddedPdfBuffer);
    embeddedPdfReadableStream.path = `embedded_${documentFile.originalname}`; // Set a filename for Pinata

    const embeddedPinataResult = await pinata.pinFileToIPFS(embeddedPdfReadableStream, { // Pass the readable stream
      pinataMetadata: {
        name: `deCertify-Embedded-Certificate-${requestId}`,
        keyvalues: {
          requestId: requestId,
          organizationId: req.user.id,
          studentId: certificateRequest.student.toString(),
          type: 'embedded_certificate_final',
        },
      },
    });
    const finalPdfIpfsHash = embeddedPinataResult.IpfsHash;
    console.log('Embedded PDF uploaded to IPFS:', finalPdfIpfsHash);

    // 6. Update the certificate request in MongoDB with the final IPFS hash
    certificateRequest.ipfsHash = finalPdfIpfsHash;
    certificateRequest.status = 'issued'; // Mark as issued
    certificateRequest.issuedAt = Date.now(); // Set issued date
    await certificateRequest.save();

    res.status(200).json({
      message: 'Document uploaded, QR code embedded, and certificate issued.',
      pdfIpfsHash: finalPdfIpfsHash, // Return the IPFS hash of the embedded PDF
    });

  } catch (err) {
    console.error('Error uploading document to IPFS or embedding QR:', err);
    res.status(500).json({ message: 'Failed to upload document or embed QR code.', error: err.message });
  }
};

module.exports = {
  uploadDocument,
};

