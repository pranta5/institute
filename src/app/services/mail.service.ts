const transporter = require("../configs/emailConfig");

interface MailOptions {
  from?: string;
  to: string;
  subject: string;
  html?: string;
}

export const sendEmailVerification = async (
  email: string,
  link: string,
  user_name: string
): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Your Account Login Details",
      html: `<p>Dear ${user_name},</p>
                <p>Email verification Link-  <a href=${link}>click here</a></p>
            `,
    } as MailOptions);
    return true;
  } catch (error: unknown) {
    console.log("Email sending error:", error);
    return false;
  }
};
