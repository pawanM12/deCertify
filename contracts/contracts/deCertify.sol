// contracts/contracts/deCertify.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol"; // For contract ownership
import "@openzeppelin/contracts/utils/Strings.sol"; // For string conversions (e.g., uint to string)

/**
 * @title deCertify
 * @dev A decentralized application for issuing and verifying certificates on the Celo blockchain.
 * Organizations can issue certificates, and anyone can verify them.
 */
contract deCertify is Ownable {
    using Strings for uint256; // Enable String utility functions for uint256

    // --- Structs ---

    // Represents a registered organization
    struct Organization {
        string name;            // Name of the organization
        address walletAddress;  // Wallet address of the organization
        bool isRegistered;      // True if the organization is registered
        uint256 verificationCharge; // Optional charge for verifying documents issued by this org
        uint256 issuanceFee;    // Optional fee for issuing a certificate by this org
    }

    // Represents a registered student
    struct Student {
        string name;            // Name of the student
        address walletAddress;  // Wallet address of the student
        bool isRegistered;      // True if the student is registered
    }

    // Represents an issued certificate
    struct Certificate {
        uint256 id;                 // Unique ID for the certificate
        address organizationAddress; // Address of the issuing organization
        address studentAddress;      // Address of the student who received the certificate
        string ipfsHash;            // IPFS hash of the certified document
        uint256 issuedAt;           // Timestamp of issuance
        bool isRevoked;             // True if the certificate has been revoked
    }

    // --- State Variables ---

    // Mapping from wallet address to Organization struct
    mapping(address => Organization) public organizations;
    // Mapping from wallet address to Student struct
    mapping(address => Student) public students;
    // Mapping from certificate ID to Certificate struct
    mapping(uint256 => Certificate) public certificates;

    uint256 private _nextCertificateId; // Counter for unique certificate IDs

    // --- Events ---

    // Emitted when an organization registers
    event OrganizationRegistered(address indexed organizationAddress, string name, uint256 verificationCharge, uint256 issuanceFee);
    // Emitted when a student registers
    event StudentRegistered(address indexed studentAddress, string name);
    // Emitted when a certificate is issued
    event CertificateIssued(
        uint256 indexed certificateId,
        address indexed organizationAddress,
        address indexed studentAddress,
        string ipfsHash,
        uint256 issuedAt
    );
    // Emitted when a certificate is revoked
    event CertificateRevoked(uint256 indexed certificateId, address indexed organizationAddress);
    // Emitted when a verification charge is paid
    event VerificationChargePaid(address indexed verifier, address indexed organization, uint256 amount);
    // Emitted when an issuance fee is paid
    event IssuanceFeePaid(address indexed student, address indexed organization, uint256 amount);

    // --- Constructor ---
    constructor() Ownable(msg.sender) {
        _nextCertificateId = 1; // Initialize certificate ID counter
    }

    // --- Modifiers ---

    // Ensures the caller is a registered organization
    modifier onlyOrganization() {
        require(organizations[msg.sender].isRegistered, "Caller is not a registered organization.");
        _;
    }

    // Ensures the caller is a registered student
    modifier onlyStudent() {
        require(students[msg.sender].isRegistered, "Caller is not a registered student.");
        _;
    }

    // --- Public Functions ---

    /**
     * @dev Registers a new organization.
     * @param _name The name of the organization.
     * @param _verificationCharge Optional charge for verifying documents.
     * @param _issuanceFee Optional fee for issuing a certificate.
     */
    function registerOrganization(string calldata _name, uint256 _verificationCharge, uint256 _issuanceFee) public {
        require(!organizations[msg.sender].isRegistered, "Organization already registered.");
        require(bytes(_name).length > 0, "Organization name cannot be empty.");
        require(!students[msg.sender].isRegistered, "Address already registered as a student."); // Prevent double registration

        organizations[msg.sender] = Organization({
            name: _name,
            walletAddress: msg.sender,
            isRegistered: true,
            verificationCharge: _verificationCharge,
            issuanceFee: _issuanceFee
        });

        emit OrganizationRegistered(msg.sender, _name, _verificationCharge, _issuanceFee);
    }

    /**
     * @dev Registers a new student.
     * @param _name The name of the student.
     */
    function registerStudent(string calldata _name) public {
        require(!students[msg.sender].isRegistered, "Student already registered.");
        require(bytes(_name).length > 0, "Student name cannot be empty.");
        require(!organizations[msg.sender].isRegistered, "Address already registered as an organization."); // Prevent double registration

        students[msg.sender] = Student({
            name: _name,
            walletAddress: msg.sender,
            isRegistered: true
        });

        emit StudentRegistered(msg.sender, _name);
    }

    /**
     * @dev Issues a new certificate. Only callable by registered organizations.
     * Requires the student to be registered.
     * An optional issuance fee can be required.
     * @param _studentAddress The wallet address of the student receiving the certificate.
     * @param _ipfsHash The IPFS hash of the certified document.
     */
    function issueCertificate(address _studentAddress, string calldata _ipfsHash) public payable onlyOrganization {
        require(students[_studentAddress].isRegistered, "Student not registered.");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty.");

        // Check if issuance fee is required and paid
        uint256 requiredFee = organizations[msg.sender].issuanceFee;
        require(msg.value >= requiredFee, "Insufficient issuance fee paid.");

        // Transfer the issuance fee to the organization if applicable
        if (requiredFee > 0) {
            payable(msg.sender).transfer(msg.value); // msg.sender is the organization
            emit IssuanceFeePaid(_studentAddress, msg.sender, msg.value);
        }

        uint256 currentId = _nextCertificateId;
        certificates[currentId] = Certificate({
            id: currentId,
            organizationAddress: msg.sender,
            studentAddress: _studentAddress,
            ipfsHash: _ipfsHash,
            issuedAt: block.timestamp,
            isRevoked: false
        });

        _nextCertificateId++; // Increment for the next certificate

        emit CertificateIssued(currentId, msg.sender, _studentAddress, _ipfsHash, block.timestamp);
    }

    /**
     * @dev Verifies a certificate by its ID. An optional verification charge can be required.
     * @param _certificateId The ID of the certificate to verify.
     * @return bool True if the certificate exists and is not revoked.
     * @return string The IPFS hash of the document if verification is successful.
     */
    function verifyCertificate(uint256 _certificateId) public payable returns (bool, string memory) {
        require(certificates[_certificateId].organizationAddress != address(0), "Certificate does not exist.");

        Certificate storage cert = certificates[_certificateId];
        require(!cert.isRevoked, "Certificate has been revoked.");

        // Check if verification charge is required and paid
        uint256 requiredCharge = organizations[cert.organizationAddress].verificationCharge;
        require(msg.value >= requiredCharge, "Insufficient verification charge paid.");

        // Transfer the verification charge to the organization if applicable
        if (requiredCharge > 0) {
            payable(cert.organizationAddress).transfer(msg.value);
            emit VerificationChargePaid(msg.sender, cert.organizationAddress, msg.value);
        }

        return (true, cert.ipfsHash);
    }

    /**
     * @dev Allows an organization to revoke a certificate they issued.
     * @param _certificateId The ID of the certificate to revoke.
     */
    function revokeCertificate(uint256 _certificateId) public onlyOrganization {
        require(certificates[_certificateId].organizationAddress != address(0), "Certificate does not exist.");
        require(certificates[_certificateId].organizationAddress == msg.sender, "Only the issuing organization can revoke this certificate.");
        require(!certificates[_certificateId].isRevoked, "Certificate is already revoked.");

        certificates[_certificateId].isRevoked = true;
        emit CertificateRevoked(_certificateId, msg.sender);
    }

    /**
     * @dev Gets the details of a certificate.
     * @param _certificateId The ID of the certificate.
     * @return id The unique ID of the certificate.
     * @return organizationAddress The address of the issuing organization.
     * @return studentAddress The address of the student who received the certificate.
     * @return ipfsHash The IPFS hash of the certified document.
     * @return issuedAt The timestamp of issuance.
     * @return isRevoked True if the certificate has been revoked.
     */
    function getCertificateDetails(uint256 _certificateId) public view returns (
        uint256 id,
        address organizationAddress,
        address studentAddress,
        string memory ipfsHash,
        uint256 issuedAt,
        bool isRevoked
    ) {
        require(certificates[_certificateId].organizationAddress != address(0), "Certificate does not exist.");
        Certificate storage cert = certificates[_certificateId];
        return (
            cert.id,
            cert.organizationAddress,
            cert.studentAddress,
            cert.ipfsHash,
            cert.issuedAt,
            cert.isRevoked
        );
    }

    /**
     * @dev Allows the contract owner to withdraw funds.
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw.");
        payable(owner()).transfer(balance);
    }
}

