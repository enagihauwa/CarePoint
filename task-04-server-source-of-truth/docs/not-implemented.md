# Security Controls Not Implemented

## Introduction

During the development of CarePoint Clinic, I identified some additional security controls that could improve the application's protection. However, I decided not to implement all of them at this stage because I wanted to prioritise the essential security requirements while keeping the application simple and accessible to patients.

The following controls have been deliberately left out for now.

### 1. Two-Factor Authentication (2FA)

**Why I did not implement it:**

I decided to focus on the basic account security features first. Server-side validation, rate limiting and a breach check on new passwords are built and tested. Password hashing is measured (`docs/hashing.md`) but not applied yet, because there is no users table. Adding another authentication step could also make the login process more difficult for patients who may not be comfortable with technology.

**When I would add it:**

I would consider implementing 2FA when the application begins handling more sensitive patient information or when the clinic requires an additional layer of account protection.

### 2. CAPTCHA

**Why I did not implement it:**

CAPTCHA can help prevent automated registrations and abuse, but it may make the application difficult to use, especially for patients using low-cost Android phones, slow internet connections or assistive technologies.

**When I would add it:**

I would consider adding CAPTCHA if automated registration attempts or bot activity become a problem that existing rate limiting cannot adequately control.

### 3. Device Fingerprinting

**Why I did not implement it:**

Device fingerprinting can help identify suspicious login activity, but it introduces additional privacy considerations and may collect information about a patient's device. I did not consider it necessary for the current stage of the application.

**When I would add it:**

I would consider it if CarePoint experiences repeated suspicious login attempts across different accounts and needs better ways to identify unusual activity.

### 4. IP Reputation Checks

**Why I did not implement it:**

IP reputation services can help identify requests from suspicious sources. However, they may introduce additional costs and could incorrectly flag legitimate patients, particularly those using shared networks or mobile internet connections.

**When I would add it:**

I would consider this control if the application begins experiencing persistent attacks from suspicious IP addresses that cannot be adequately managed through rate limiting.

### 5. Web Application Firewall (WAF)

**Why I did not implement it:**

A WAF provides another layer of protection against common web attacks, but it requires additional configuration, monitoring and possibly subscription costs. I decided to prioritise the security controls that are directly required for the current application.

**When I would add it:**

I would consider deploying a WAF before making CarePoint publicly available to real patients, particularly as the application grows and handles more sensitive information.

## Conclusion

These controls were not ignored; they were deliberately deferred based on the current scope and development priorities of CarePoint Clinic. I recognise that they may become necessary as the application grows. Before real patients use the application, the security requirements should be reviewed again to determine which additional protections are necessary.
