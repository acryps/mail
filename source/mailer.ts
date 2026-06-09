import { createTransport, Transporter } from 'nodemailer';
import { MailComponent } from "./mail-component";

export type MailContent = {
	subject: string;
	text: string;
	html: string;
}

export type Mail = {
	recipients: string[];
} & MailContent;

type DKIM = {
	domainName: string,
	keySelector: string,
	privateKey: string
};

type SendRetryOptions = {
	intervalSeconds: number;
	maxRetries: number;
};

export class Mailer {
	private transporter: Transporter;

	private dkim?: DKIM;
	private sendRetryOptions?: SendRetryOptions;

	constructor(
		private sender: string,
		configuration: object
	) {
		this.transporter = createTransport(configuration);
	}

	addDKIM(domain: string, privateKey: string, keySelector: string = 'default') {
		this.dkim = {
			domainName: domain,
			privateKey,
			keySelector
		};

		return this;
	}

	enableSendRetry(intervalSeconds: number, maxRetries: number) {
		this.sendRetryOptions = {
			intervalSeconds,
			maxRetries,
		};

		return this;
	}

	async send(recipients: string | string[], component: MailComponent) {
		await component.load();

		const rendered = component.render();

		const options: any = {
			from: this.sender,
			to: Array.isArray(recipients) ? recipients.join(', ') : recipients,
			subject: component.subject,
			text: rendered.textContent,
			html: rendered.outerHTML,
		};

		if (this.dkim) {
			options.dkim = this.dkim;
		}

		const sendRetryOptions = this.sendRetryOptions ?? { intervalSeconds: 0, maxRetries: 1 };
		let retries = 0;

		return new Promise<void>((done, reject) => {
			const interval = setInterval(() => {
				this.transporter.sendMail(options, (error: any) => {
					if (error) {
						retries++;

						if (retries >= sendRetryOptions.maxRetries) {
							clearInterval(interval);
							reject(error);
						}
					} else {
						clearInterval(interval);
						done();
					}
				});
			}, sendRetryOptions.intervalSeconds * 1000);
		});
	}
}
