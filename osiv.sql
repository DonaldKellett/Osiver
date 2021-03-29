CREATE USER 'osiv'@'localhost' IDENTIFIED BY 'P@ssw0rd';
CREATE USER 'osiv'@'%' IDENTIFIED BY 'P@ssw0rd';
CREATE DATABASE osiv;
GRANT ALL PRIVILEGES ON osiv.* TO 'osiv'@'localhost';
GRANT ALL PRIVILEGES ON osiv.* TO 'osiv'@'%';
USE osiv;
CREATE TABLE Accounts (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(32),
  password BINARY(60),
  prettyName VARCHAR(1024),
  privileged BOOL
);
