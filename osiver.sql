CREATE USER 'osiver'@'localhost' IDENTIFIED BY 'P@ssw0rd';
CREATE USER 'osiver'@'%' IDENTIFIED BY 'P@ssw0rd';
CREATE DATABASE osiver;
GRANT ALL PRIVILEGES ON osiver.* TO 'osiver'@'localhost';
GRANT ALL PRIVILEGES ON osiver.* TO 'osiver'@'%';
USE osiver;
CREATE TABLE Accounts (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(32),
  password BINARY(60),
  prettyName VARCHAR(1024),
  privileged BOOL
);
