<?php
// Get form data
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

// In real apps, you NEVER store plain text passwords.
// Let's hash it before "saving"
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Simulate saving (here just printing, normally goes into DB)
echo "Signup successful!<br>";
echo "Username: " . htmlspecialchars($username) . "<br>";
echo "Hashed Password (for storage): " . $hashedPassword;
?>

