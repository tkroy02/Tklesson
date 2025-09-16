<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Signup | Enhanced Design</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #4361ee;
            --secondary: #3a0ca3;
            --accent: #f72585;
            --light: #f8f9fa;
            --dark: #212529;
            --success: #4cc9f0;
            --error: #e63946;
            --warning: #ffc107;
            --gray: #6c757d;
            --border-radius: 12px;
            --box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s ease;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            color: var(--dark);
            line-height: 1.6;
        }
        
        .container {
            width: 100%;
            max-width: 450px;
            animation: fadeIn 0.8s ease;
        }
        
        .card {
            background: white;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            padding: 35px;
            transition: var(--transition);
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .logo {
            color: var(--primary);
            font-size: 48px;
            margin-bottom: 15px;
        }
        
        .header h2 {
            font-weight: 700;
            color: var(--dark);
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        .header p {
            color: var(--gray);
            font-size: 16px;
        }
        
        .form-group {
            margin-bottom: 20px;
            position: relative;
        }
        
        .form-group.error .form-control {
            border-color: var(--error);
            background-color: rgba(230, 57, 70, 0.05);
        }
        
        .form-group.error .input-icon {
            color: var(--error);
        }
        
        .error-message {
            color: var(--error);
            font-size: 12px;
            margin-top: 5px;
            padding-left: 50px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .form-group.error .error-message {
            opacity: 1;
        }
        
        .input-icon {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--gray);
            font-size: 18px;
            transition: var(--transition);
        }
        
        .form-control {
            width: 100%;
            padding: 15px 15px 15px 50px;
            border: 2px solid #e6e6e6;
            border-radius: var(--border-radius);
            font-size: 16px;
            transition: var(--transition);
            background-color: #fafafa;
        }
        
        .form-control:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.15);
            outline: none;
            background-color: white;
        }
        
        .form-control.valid {
            border-color: var(--success);
            background-color: rgba(76, 201, 240, 0.05);
        }
        
        .student-badge {
            display: inline-flex;
            align-items: center;
            background: linear-gradient(to right, rgba(67, 97, 238, 0.1), rgba(58, 12, 163, 0.1));
            color: var(--primary);
            padding: 8px 16px;
            border-radius: 50px;
            font-weight: 600;
            margin-bottom: 20px;
            border: 1px solid rgba(67, 97, 238, 0.2);
        }
        
        .student-badge i {
            margin-right: 8px;
            font-size: 18px;
        }
        
        .btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(to right, var(--primary), var(--secondary));
            color: white;
            border: none;
            border-radius: var(--border-radius);
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
            box-shadow: 0 4px 15px rgba(67, 97, 238, 0.3);
            position: relative;
            overflow: hidden;
        }
        
        .btn:hover {
            background: linear-gradient(to right, var(--secondary), var(--primary));
            box-shadow: 0 6px 20px rgba(67, 97, 238, 0.4);
            transform: translateY(-2px);
        }
        
        .btn:active {
            transform: translateY(0);
        }
        
        .btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }
        
        #signupMsg {
            padding: 15px;
            border-radius: var(--border-radius);
            margin-top: 20px;
            text-align: center;
            font-weight: 500;
            opacity: 0;
            max-height: 0;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        #signupMsg.visible {
            opacity: 1;
            max-height: 200px;
        }
        
        .success {
            background-color: rgba(76, 201, 240, 0.15);
            color: var(--success);
            border: 1px solid var(--success);
        }
        
        .error {
            background-color: rgba(230, 57, 70, 0.15);
            color: var(--error);
            border: 1px solid var(--error);
        }
        
        .warning {
            background-color: rgba(255, 193, 7, 0.15);
            color: var(--warning);
            border: 1px solid var(--warning);
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            color: var(--gray);
            font-size: 14px;
        }
        
        .footer a {
            color: var(--primary);
            text-decoration: none;
            transition: var(--transition);
        }
        
        .footer a:hover {
            color: var(--secondary);
            text-decoration: underline;
        }
        
        .password-toggle {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: var(--gray);
            transition: var(--transition);
        }
        
        .password-toggle:hover {
            color: var(--primary);
        }
        
        .password-strength {
            margin-top: 5px;
            padding-left: 50px;
        }
        
        .strength-bar {
            height: 3px;
            background-color: #e6e6e6;
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 5px;
        }
        
        .strength-fill {
            height: 100%;
            width: 0%;
            transition: all 0.3s ease;
            border-radius: 2px;
        }
        
        .strength-text {
            font-size: 11px;
            color: var(--gray);
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            15%, 45%, 75% { transform: translateX(-10px); }
            30%, 60%, 90% { transform: translateX(10px); }
        }
        
        .shake {
            animation: shake 0.6s ease;
        }
        
        @media (max-width: 500px) {
            .card {
                padding: 25px;
            }
            
            .header h2 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="logo">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <h2>Student Sign Up</h2>
                <p>Join our community and start your learning journey</p>
            </div>
            
            <div class="student-badge">
                <i class="fas fa-user-graduate"></i>
                <span>Student Account Registration</span>
            </div>
            
            <form id="signupForm">
                <div class="form-group" id="nameGroup">
                    <i class="fas fa-user input-icon"></i>
                    <input type="text" id="name" class="form-control" placeholder="Full Name" required>
                    <div class="error-message" id="nameError"></div>
                </div>
                
                <div class="form-group" id="emailGroup">
                    <i class="fas fa-envelope input-icon"></i>
                    <input type="email" id="email" class="form-control" placeholder="Email Address" required>
                    <div class="error-message" id="emailError"></div>
                </div>
                
                <div class="form-group" id="passwordGroup">
                    <i class="fas fa-lock input-icon"></i>
                    <input type="password" id="password" class="form-control" placeholder="Password" required minlength="6">
                    <i class="fas fa-eye password-toggle" id="passwordToggle"></i>
                    <div class="error-message" id="passwordError"></div>
                    <div class="password-strength" id="passwordStrength" style="display: none;">
                        <div class="strength-bar">
                            <div class="strength-fill" id="strengthFill"></div>
                        </div>
                        <div class="strength-text" id="strengthText"></div>
                    </div>
                </div>
                
                <button type="submit" class="btn" id="signupBtn">
                    <i class="fas fa-user-plus"></i> Create Student Account
                </button>
            </form>
            
            <p id="signupMsg" role="alert"></p>
            
            <div class="footer">
                Already have an account? <a href="login.html">Login here</a><br>
                <span style="font-size: 12px;">
                    Are you a tutor? <a href="tutor_approval.html">Apply to become a tutor</a>
                </span>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const form = document.getElementById("signupForm");
            const signupBtn = document.getElementById("signupBtn");
            const signupMsg = document.getElementById("signupMsg");
            const passwordInput = document.getElementById("password");
            const passwordToggle = document.getElementById("passwordToggle");
            const nameInput = document.getElementById("name");
            const emailInput = document.getElementById("email");

            // Password visibility toggle with better UX
            passwordToggle.addEventListener('click', () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                passwordToggle.classList.toggle('fa-eye', !isPassword);
                passwordToggle.classList.toggle('fa-eye-slash', isPassword);
            });

            // Real-time validation functions
            function validateName(name) {
                if (!name.trim()) {
                    return "Name is required";
                }
                if (name.trim().length < 2) {
                    return "Name must be at least 2 characters long";
                }
                if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
                    return "Name should only contain letters and spaces";
                }
                return null;
            }

            function validateEmail(email) {
                if (!email.trim()) {
                    return "Email is required";
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return "Please enter a valid email address";
                }
                return null;
            }

            function validatePassword(password) {
                if (!password) {
                    return "Password is required";
                }
                if (password.length < 6) {
                    return "Password must be at least 6 characters long";
                }
                return null;
            }

            function checkPasswordStrength(password) {
                const strengthIndicator = document.getElementById('passwordStrength');
                const strengthFill = document.getElementById('strengthFill');
                const strengthText = document.getElementById('strengthText');
                
                if (!password) {
                    strengthIndicator.style.display = 'none';
                    return;
                }
                
                strengthIndicator.style.display = 'block';
                
                let strength = 0;
                let text = '';
                let color = '';
                
                // Check criteria
                if (password.length >= 6) strength += 20;
                if (password.length >= 10) strength += 20;
                if (/[a-z]/.test(password)) strength += 20;
                if (/[A-Z]/.test(password)) strength += 20;
                if (/[0-9]/.test(password)) strength += 10;
                if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
                
                if (strength < 40) {
                    text = 'Weak';
                    color = '#e63946';
                } else if (strength < 70) {
                    text = 'Fair';
                    color = '#ffc107';
                } else if (strength < 90) {
                    text = 'Good';
                    color = '#28a745';
                } else {
                    text = 'Strong';
                    color = '#4cc9f0';
                }
                
                strengthFill.style.width = strength + '%';
                strengthFill.style.backgroundColor = color;
                strengthText.textContent = text;
                strengthText.style.color = color;
            }

            function showFieldError(fieldId, message) {
                const group = document.getElementById(fieldId + 'Group');
                const error = document.getElementById(fieldId + 'Error');
                group.classList.add('error');
                error.textContent = message;
            }

            function clearFieldError(fieldId) {
                const group = document.getElementById(fieldId + 'Group');
                const error = document.getElementById(fieldId + 'Error');
                const input = document.getElementById(fieldId);
                group.classList.remove('error');
                error.textContent = '';
                if (input.value.trim()) {
                    input.classList.add('valid');
                } else {
                    input.classList.remove('valid');
                }
            }

            function showMessage(message, type) {
                signupMsg.textContent = message;
                signupMsg.className = type + ' visible';
                
                if (type === 'error') {
                    form.classList.add('shake');
                    setTimeout(() => form.classList.remove('shake'), 600);
                }
                
                // Auto-hide success messages after 5 seconds
                if (type === 'success') {
                    setTimeout(() => {
                        signupMsg.classList.remove('visible');
                        setTimeout(() => {
                            signupMsg.className = '';
                            signupMsg.textContent = '';
                        }, 300);
                    }, 5000);
                }
            }

            // Real-time validation
            nameInput.addEventListener('input', () => {
                const error = validateName(nameInput.value);
                if (error) {
                    showFieldError('name', error);
                } else {
                    clearFieldError('name');
                }
            });

            emailInput.addEventListener('input', () => {
                const error = validateEmail(emailInput.value);
                if (error) {
                    showFieldError('email', error);
                } else {
                    clearFieldError('email');
                }
            });

            passwordInput.addEventListener('input', () => {
                const password = passwordInput.value;
                const error = validatePassword(password);
                
                if (error) {
                    showFieldError('password', error);
                } else {
                    clearFieldError('password');
                }
                
                checkPasswordStrength(password);
            });

            // Enhanced form submission with comprehensive validation
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                
                // Clear previous messages
                signupMsg.textContent = "";
                signupMsg.className = "";
                
                // Get form data
                const formData = {
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passwordInput.value,
                    role: 'student' // Fixed role for student signup
                };
                
                // Validate all fields
                const nameError = validateName(formData.name);
                const emailError = validateEmail(formData.email);
                const passwordError = validatePassword(formData.password);
                
                let hasErrors = false;
                
                if (nameError) {
                    showFieldError('name', nameError);
                    hasErrors = true;
                } else {
                    clearFieldError('name');
                }
                
               if (passwordError) {
    showFieldError('password', passwordError);
    hasErrors = true;
} else {
    clearFieldError('password');
}

// If there are validation errors, stop submission
if (hasErrors) {
    showMessage("Please fix the errors in the form.", "error");
    return;
}

// Disable the button and show loading state
signupBtn.disabled = true;
signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

try {
    // Simulate API call with timeout
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real application, you would make an API call here:
    // const response = await fetch('/api/signup', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(formData)
    // });
    
    // For demo purposes, we'll simulate a successful registration
    const success = Math.random() > 0.2; // 80% success rate for demo
    
    if (success) {
        showMessage("Account created successfully! Redirecting to login...", "success");
        
        // Reset form
        form.reset();
        document.getElementById('passwordStrength').style.display = 'none';
        
        // In a real app, you would redirect after successful signup
        setTimeout(() => {
            // window.location.href = 'login.html';
        }, 3000);
    } else {
        // Simulate email already exists error
        showMessage("This email is already registered. Please use a different email or login.", "error");
        showFieldError('email', "Email already registered");
    }
} catch (error) {
    console.error("Signup error:", error);
    showMessage("Network error. Please check your connection and try again.", "error");
} finally {
    // Re-enable the button
    signupBtn.disabled = false;
    signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Student Account';
}
});

// Add focus styles for better accessibility
const formControls = document.querySelectorAll('.form-control');
formControls.forEach(control => {
control.addEventListener('focus', () => {
    control.parentElement.classList.add('focused');
});

control.addEventListener('blur', () => {
    control.parentElement.classList.remove('focused');
});
});

// Add keyboard navigation support
form.addEventListener('keydown', (e) => {
if (e.key === 'Enter') {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
}
});

// Add hover effects for form groups
const formGroups = document.querySelectorAll('.form-group');
formGroups.forEach(group => {
group.addEventListener('mouseenter', () => {
    group.querySelector('.input-icon').style.color = 'var(--primary)';
});

group.addEventListener('mouseleave', () => {
    if (!group.classList.contains('error') && !group.querySelector('.form-control').value) {
        group.querySelector('.input-icon').style.color = 'var(--gray)';
    }
});
});

// Initialize tooltips for password requirements
passwordInput.addEventListener('focus', () => {
const requirements = [
    'At least 6 characters',
    'Contains uppercase letter',
    'Contains lowercase letter',
    'Contains number',
    'Contains special character (optional)'
].join('\n');

passwordInput.title = requirements;
});

// Add animation for successful validation
const inputs = document.querySelectorAll('.form-control');
inputs.forEach(input => {
input.addEventListener('blur', () => {
    if (input.value && !input.parentElement.classList.contains('error')) {
        input.classList.add('valid');
    }
});
});

console.log("Student signup form initialized successfully!");
});

// Add styles for the focused state
const style = document.createElement('style');
style.textContent = `
.form-group.focused .input-icon {
    color: var(--primary) !important;
}

.form-group.focused .form-control {
    background-color: white !important;
}

.btn:disabled {
    opacity: 0.7;
    transform: none !important;
    box-shadow: 0 4px 15px rgba(67, 97, 238, 0.2) !important;
}

.fa-spinner {
    animation: fa-spin 1s infinite linear;
}

@keyframes fa-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);
</script>
</body>
</html>
