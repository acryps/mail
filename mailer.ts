
import { MailComponent } from "./mail-component";
import { Transporter, createTransport } from "nodemailer";

let renderingLanguage: string;

Object.defineProperty(String.prototype, 'german', {
	get() {
		return (translation: string) => renderingLanguage == 'de' ? translation : this;
	}
});

export class Mailer<TStoredMail> {
	resendInterval: number = 5 * 60 * 1000;

	getUnsent: () => Promise<TStoredMail[]>;
	onSend: (mail: TStoredMail) => void;
	onError: (mail: TStoredMail, error: Error) => void;

	getSubject = async (mail: TStoredMail) => (mail as any).subject as string;
	setSubject = async (mail: TStoredMail, value: string) => { (mail as any).subject = value };

	getRecipients = async (mail: TStoredMail) => (mail as any).recipients as string | string[];
	setRecipients = async (mail: TStoredMail, value: string | string[]) => { (mail as any).recipients = value };

	getText = async (mail: TStoredMail) => (mail as any).text as string;
	setText = async (mail: TStoredMail, value: string) => { (mail as any).text = value };

	getHypertextBody = async (mail: TStoredMail) => (mail as any).html;
	setHypertextBody = async (mail: TStoredMail, value: string) => { (mail as any).html = value };

	create = async (mail: TStoredMail) => (mail as any).create();
	markAsSent = async (mail: TStoredMail) => {
		(mail as any).sent = new Date();

		(mail as any).update();
	}

	private transporter: Transporter;
	private dkim: {
		domainName: string,
		keySelector: string,
		privateKey: string
	};

	constructor(
		private readonly storedMailConstructor: new () => TStoredMail,
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

	async send(mailComponent: MailComponent, recipients: string | string[], language: string) {
		await mailComponent.load();

		// Set language & render sync to ensure correct language in translate polyfill
		renderingLanguage = language;
		const rendered = mailComponent.render();

		const model = new this.storedMailConstructor();
		this.setSubject(model, mailComponent.subject);
		this.setHypertextBody(model, rendered.outerHTML);
		this.setText(model, rendered.textContent);
		this.setRecipients(model, recipients);

		await this.create(model);

		this.push(model);
	}

	private async resend() {
		for (const mail of await this.getUnsent() ?? []) {
			await this.push(mail);
		}
	}

	private async push(mail: TStoredMail) {
		const options: any = {
			from: this.senderEmail,
			to: await this.getRecipients(mail),
			subject: await this.getSubject(mail),
			text: await this.getText(mail),
			html: await this.getHypertextBody(mail),
		};

		if (this.dkim) {
			options.dkim = this.dkim;
		}

		return new Promise<void>((done, reject) => {
			this.transporter.sendMail(options, async error => {
				if (error) {
					this.onError(mail, error);

					reject(error);
				} else {
					this.markAsSent(mail);
					this.onSend(mail);

					done();
				}
			});
		});
	};
}