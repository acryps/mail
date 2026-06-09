# ACRYPS MAIL
Component based mail handler

> This package uses [nodemailer](https://npmjs.com/nodemailer).

## Usage

The sender email address and the SMTP transport configuration is required for a minimal `Mailer`. The configuration options is equivalent to the nodemailer documented [here](https://nodemailer.com/smtp).

Over the builder pattern further customizations can be made to the `Mailer`.
- **DKIM:** Sign your mails to claim some responsibility for a message
- **Send Retries:** Define how many times it tries to resend an email upon failure and in what interval. *(By default it only tries once)*

Here's an example:
```ts
import { Mailer } from "@acryps/mail";

new Mailer(
	SENDER_ADDRESS,
	{
		host: SMTP_SERVER,
		port: SMTP_PORT,
		secure: true,
		auth: {
			user: SENDER_ADDRESS,
			pass: SENDER_PASSWORD,
		},
		tls: {
			rejectUnauthorized: false
		}
	}
)
	.addDKIM(DKIM_DOMAIN, DKIM_KEY)
	.enableSendRetry(INTERVAL_IN_SECONDS, MAX_RETRIES);
```

You can define stylized TSX `MailComponents` to send over the `Mailer`. The subject getter and render method are mandatory to implement. The onload is optional.
```ts
import { MailComponent, MailNode } from "@acryps/mail";

export class ExampleMail extends MailComponent {
	get subject(): string {
		return 'Example subject';
	}

	onload() {
		// optionally load something
	}

	render(): MailNode {
		return <html>
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<meta name="x-apple-disable-message-reformatting" />

				<style>...</style>
			</head>

			<body>
				<div class="header">
					<img src='https://example.com/mail-banner.jpg' />
				</div>

				<div class="main">
					<h1>This is an example</h1>
					<p>Lorem vestibulum dui porttitor turpis interdum. Consectetur cursus dui duis purus ex aliquam purus. Risus id leo lectus est pharetra. Sed volutpat dolor metus enim ut.</p>
				</div>
			</body>
		</html>;
	}
}
```

Finally a mail can be simply sent like this:
```ts
mailer.send(RECIPIENTS, new ExampleMail());
```

The recipients can be a single string or an of strings. The send method returns a Promise\<void>.

> It's strongly recommended to use `then`, `catch` and `finally` instead of awaiting the promise to prevent blocking the request for multiple seconds. The `Mailer` is designed as a fire and forget principle.

## Sponsoring and support
This project is sponsored and supported by [ACRYPS](https://acryps.com).
