import { MailComponent } from "./mail";
import { Transporter, createTransport } from "nodemailer";

export class Mailer {
    static language: string;

    resendIntervalMinutes: number;

    private transporter: Transporter;

	constructor(
        configuration: object,
        private senderAddress: string,
        private dkim: {
            domain: string,
            key: string
        },
        private onQueue: (text: string, html: string) => void,
        private onSend: () => void,
        private getFailedMails: () => { receiver: string, subject: string, text: string, html: string }[]
    ) {
		this.transporter = createTransport(configuration);

        const resendInterval = () => {
            setTimeout(async () => {
                await this.resend();
                resendInterval();
            }, this.resendIntervalMinutes * 1000 * 60);
        }

        resendInterval();
	}

	async send(language: string, mailComponent: MailComponent, receiver: string) {
        await mailComponent.load();

        // Set language & render sync to ensure correct language in translate polyfill
        Mailer.language = language;
        const rendered = mailComponent.render();
        const text = rendered.textContent;
        const html = rendered.outerHTML;

        this.onQueue(text, html);

		await this.push(receiver, mailComponent.subject, text, html)
            .catch(error => console.log(error));
	}

    private async resend() {
        for (const mail of this.getFailedMails()) {
            await this.push(mail.receiver, mail.subject, mail.text, mail.html)
                .catch(error => console.log(error));
		}
	}

    private async push(receiver: string, subject: string, text: string, html: string) {
        const options = {
            from: this.senderAddress,
            to: receiver,
            subject: subject,
            text: text,
            html: html,
            dkim: {
                domainName: this.dkim.domain,
                keySelector: 'default',
                privateKey: this.dkim.key
            }
        };

        return new Promise<void>((done, reject) => {
            this.transporter.sendMail(options, async error => {
                if (error) {
                    reject(error);
                } else {
                    this.onSend();

                    done();
                }
            });
        });
    };
}