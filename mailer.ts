
import { MailComponent } from "./mail-component";
import { Transporter, createTransport } from "nodemailer";

let renderingLanguage: string;

Object.defineProperty(String.prototype, 'german', {
	get() {
		return (translation: string) => renderingLanguage == 'de' ? translation : this;
	}
});

export type MailContent = {
	subject: string;
	text: string;
	html: string;

	recipients: string | string[];
}

export class Mailer<TStoredMail, TStoredRecipient> {
	resendInterval: number = 5 * 60 * 1000;

	getUnsent = async () => [] as TStoredMail[];
	create = async (recipients: TStoredRecipient | TStoredRecipient[], mail: MailContent) => new this.StoredMail();
	toMailContent = async (model: TStoredMail) => ({
		subject: (model as any).subject,
		text: (model as any).text,
		html: (model as any).html,
		recipients: (model as any).recipients
	} as MailContent);
	toEmail = (recipient: TStoredRecipient) => typeof recipient == 'string' ? recipient : (recipient as any).email;

	onSendSuccess = async (model: TStoredMail) => {};
	onSendError = async (model: TStoredMail, mail: MailContent, error: Error) => {};

	private transporter: Transporter;
	private dkim: {
		domainName: string,
		keySelector: string,
		privateKey: string
	};

	constructor(
		private readonly StoredMail: new () => TStoredMail,
		public readonly senderEmail: string,
		public readonly configuration: object
	) {
		this.transporter = createTransport(configuration);

		const resendInterval = () => {
			setTimeout(async () => {
				try {
					await this.resend();
				} catch {}

				resendInterval();
			}, this.resendInterval);
		}

		resendInterval();
	}

	addDKIM(domain: string, privateKey: string, keySelector: string = 'default') {
		this.dkim = {
			domainName: domain,
			privateKey,
			keySelector
		}
	}

	async send(mailComponent: MailComponent, recipients: TStoredRecipient | TStoredRecipient[], language: string) {
		await mailComponent.load();

		// Set language & render sync to ensure correct language in translate polyfill
		renderingLanguage = language;
		const rendered = mailComponent.render();

		const model: TStoredMail = await this.create(recipients, {
			subject: mailComponent.subject,
			text: rendered.textContent,
			html: rendered.outerHTML,
			recipients: Array.isArray(recipients) ? recipients.map(recipient => this.toEmail(recipient)) : this.toEmail(recipients)
		});

		this.push(model);
	}

	private async resend() {
		for (const mail of await this.getUnsent()) {
			await this.push(mail);
		}
	}

	private async push(model: TStoredMail) {
		const mail = await this.toMailContent(model);

		const options: any = {
			from: this.senderEmail,
			to: mail.recipients,
			subject: mail.subject,
			text: mail.text,
			html: mail.html,
		};

		if (this.dkim) {
			options.dkim = this.dkim;
		}

		return new Promise<void>((done, reject) => {
			this.transporter.sendMail(options, async error => {
				if (error) {
					this.onSendError(model, mail, error);

					reject(error);
				} else {
					this.onSendSuccess(model);

					done();
				}
			});
		});
	};
}