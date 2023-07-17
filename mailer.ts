
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
}

export type SendableMail = MailContent & {
	recipients: string | string[];
}

export class Mailer<TStoredMail, TStoredRecipient> {
	resendInterval: number = 5 * 60 * 1000;

	onSendError = async (storedMail: TStoredMail, sendableMail: SendableMail, error: Error) => {};

	private transporter: Transporter;
	private dkim: {
		domainName: string,
		keySelector: string,
		privateKey: string
	};

	constructor(
		public readonly sender: string,
		public readonly configuration: object,
		private convertToSendableMail: (storedMail: TStoredMail) => Promise<SendableMail>,
		private createStoredMail: (recipients: TStoredRecipient | TStoredRecipient[], mailContent: MailContent) => Promise<TStoredMail>,
		private onSendSuccess: (storedMail: TStoredMail) => Promise<any>,
		private unsentQueue: TStoredMail[] = []
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

		const model: TStoredMail = await this.createStoredMail(recipients, {
			subject: mailComponent.subject,
			text: rendered.textContent,
			html: rendered.outerHTML
		});

		await this.push(model);
	}

	private async resend() {
		for (let index = 0; index < this.unsentQueue.length; index++) {
			await this.push(this.unsentQueue.shift());
		}
	}

	private async push(model: TStoredMail) {
		const mail = await this.convertToSendableMail(model);

		const options: any = {
			from: this.sender,
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
					this.unsentQueue.push(model);

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