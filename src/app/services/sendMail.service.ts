const transporter = require("../configs/emailConfig");

interface MailOptions {
  from?: string;
  to: string;
  subject: string;
  html?: string;
}

export const sendEmail = async (
  email: string,
  text: string,
  html: string
): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `${text}`,
      html: `${html}`,
    } as MailOptions);
    return true;
  } catch (error: unknown) {
    console.log("Email sending error:", error);
    return false;
  }
};
