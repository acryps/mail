# acryps mail
Component based queued mail handler

Acryps mail is based on nodemailer. When initializing a mailer you have to define a bunch of things right away.

Mail | TStoredMail, TStoredAddress
:-- | :--
Sender address | Email address to send from
Transport configuration | Nodemailer config for the mail transporter (It has no typings because nodemailer doesn't provide them in the first place)
Convert to sendable mail | Convert TStoredMail into a sendable mail
Create | Create mail and addresses
Mark as sent | Mark mail as sent
Unsent queue | Optional initial unsent mail queue (fetch from db)

These are the minimum requirements for a functional mailer.
Optionally DKIM can be added to sign the mails in the headers and send error can be handled.

Example usage:
<pre>
const mailer = new Mailer&lt;Mail, Address&gt;(
	'example@domain.com', 

	// Transport configuration
	{
		host: 'smtp.host.com',
		port: 587,
		secure: false,
		auth: {
			user: 'example@domain.com',
			pass: 'securepassword1234'
		},
		tls: {
			rejectUnauthorized: false
		}
	}, 

	// Convert to sendable mail
	async model => {
		const recipients: string[] = await getRecipientEmails(model);

		return {
			subject: model.subject,
			text: model.text,
			html: model.html,
			recipients
		}
	},

	// Create
	async (addresses, mail) => {
		const model = new Mail();

		model.created = new Date();
		model.subject = mail.subject;
		model.text = mail.text;
		model.html = mail.html;

		await model.create();

		for (const address of addresses) {
			const mailAddress = new MailAddress();

			mailAddress.address = address;
			mailAddress.mail = model;

			await mailAddress.create();
		}

		return model;
	},
	
	// Mark as sent
	async model => {
		model.sent = new Date();
	
		await model.update();
	},

	// Unsent queue
	await db.mail.where(mail => mail.sent == null).toArray()
);

mailer.addDKIM(process.env.MAIL_DOMAIN, process.env.MAIL_DKIM_KEY);
mailer.onSendError = async (model, mail, error) => console.log(`Mail from ${mailer.sender} to ${mail.recipients} failed to send (id: ${model.id}):`, error);
</pre>

## Sponsoring and support
This project is sponsored and supported by [ACRYPS](https://acryps.com).