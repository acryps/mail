# acryps mail
Component based queued mail handler

> This package uses [nodemailer](https://npmjs.com/nodemailer).

When initializing a mailer you have to define a bunch of things right away.

Mail | TStoredMail, TStoredAddress
:-- | :--
Sender address | Email address to send from
Transport configuration | Nodemailer config for the mail transporter (It has no typings because nodemailer doesn't provide them in the first place)
Convert to sendable mail | Convert TStoredMail into a sendable mail
Create | Create TStoredMail and TStoredAddresses
Mark as sent | Mark TStoredMail as sent
Unsent queue | Optional initial unsent TStoredMail queue (fetch from db)


These are the minimum requirements for a functional mailer.
Optionally DKIM can be added to sign the mails in the headers and send error can be handled.

The mailer also supports localization via polyfills. Defining `<div>{'Hello'.german('Hallo')}</div>` in the component automatically translates according to the preferred language passed in the send method.
Currently only german translation is supported and the tag to pass into the send method is hardcoded to `de`. This obviously isn't convenient and will be fixed soon.

## Example usage:
### Setup Mailer
```
const mailer = new Mailer<Mail, Address>(
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
```

### Creating Mail Component
```
export class ExampleMail extends MailComponent {
	constructor(
		private fullname: string
	) {}

	render(child?: MailComponent): MailNode {
		return <html>
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<meta name="x-apple-disable-message-reformatting" />
			</head>
			<head>
				<style>...</style>
			</head>
			<body>
				<div class="line">Hello {this.fullname}</div>

				{child}

				<div class="line">Greetings</div>

				<div class="address">
					<div class="address-line">Name</div>
					<div class="address-line">Street</div>
					<div class="address-line">Place City</div>
				</div>

				<a href="mailto:example@domain.com">example@domain.com</a>
			</body>
			</html>;
	}
}
```

### Sending Mail
```
// The passed address is of type TStoredAddress defined previously for the mailer.
mailer.send(new ExampleMail('Foo Bar'), address, 'de');
```

## Sponsoring and support
This project is sponsored and supported by [ACRYPS](https://acryps.com).