# Gmail setup for POS email (SMTP)

Step-by-step guide to use Gmail for sending transactional emails (e.g. reservation confirmations) from POS.

---

## 1. Create a new Gmail account

- Go to [accounts.google.com](https://accounts.google.com) and sign in or create an account.
- Create a **new** Gmail account for your restaurant or business (e.g. `your-restaurant@gmail.com`).
- Use this account only for sending POS emails so credentials stay separate from personal mail.

---

## 2. Set up two-factor authentication (2FA)

- In your Google Account, open **Security**: [myaccount.google.com/security](https://myaccount.google.com/security).
- Under “How you sign in to Google”, click **2-Step Verification** (or “Two-step verification”).
- Follow the prompts to add a second step (e.g. phone number, authenticator app).

---

## 3. Turn 2FA on

- Complete the 2FA setup so that 2-Step Verification is **on** for this account.
- Gmail App Passwords are only available when 2-Step Verification is enabled.

---

## 4. Create an App Password

- Open: **[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)**  
  (If the link says “App passwords” isn’t available, confirm 2-Step Verification is turned on.)
- Choose **Select app** → **Mail** (or “Other” and enter a name like “POS2”).
- Choose **Select device** → **Other** and enter a name (e.g. “POS2 System”).
- Click **Generate**.
- Copy the **16-character password** (you can ignore spaces).  
  You won’t be able to see it again after leaving the page.

---

## 5. Enter Gmail and password in POS

- Log in to the POS app as owner or admin.
- Go to **Settings** → **Email (SMTP)** (or **Mail**).
- Enter:
  - **Gmail address:** the Gmail account from step 1 (e.g. `your-restaurant@gmail.com`).
  - **SMTP password:** the 16-character App Password from step 4 (not your normal Gmail password).
- Optionally set **From email** and **From name** (e.g. your restaurant name).
- Save. Emails sent by POS will use this account; if you leave these fields empty, the server’s global SMTP config is used instead.

---

## Notes

- **App Password only:** Use the App Password from step 4. Do not use your normal Gmail password; it will be rejected.
- **Password with special characters:** If you store the same password in `config.env`, put it in double quotes, e.g. `SMTP_PASSWORD="your16charapppassword"`.
- **Testing:** Use **Settings → Email (SMTP)** or the debug script (`back/scripts/debug_smtp.py`) to test the connection and send a test email.
