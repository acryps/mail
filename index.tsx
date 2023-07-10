type MailNodeChild = (string | number | boolean | MailNode) | MailNodeChild[];

export class MailNode {
    private ignoredContentElements: string[] = ['head', 'svg', 'button', 'script'];

    constructor(
        private tagName: string,
        private attributes: Record<string, any> | null,
        private children: MailNodeChild[]
    ) {}

    get textContent() {
        let content = '';

        if (!this.ignoredContentElements.includes(this.tagName)) {
            for (const child of this.children) {
                if (child instanceof MailNode) {
                    content += child.textContent;

                    if (child.attributes?.class == 'spacer') {
                        content += '\n';
                    }
                } else if (Array.isArray(child)) {
                    for (const item of child) {
                        if (item instanceof MailNode) {
                            content += item.textContent;
                        } else {
                            content += item;
                        }
                    }
                } else {
                    if (this.tagName == 'a') {
                        const href: string = this.attributes?.href ?? '';
                        if (href.startsWith('http')) {
                            content += href;
                        } else if (href.startsWith('mailto:')) {
                            content += href.replace('mailto:', '');
                        }
                    } else {
                        content += child;
                    }
                }
            }
        }

        return content;
    }

    get outerHTML() {
        let parsedAttributes = '';

        if (this.attributes) {
            for (const key in this.attributes) {
                parsedAttributes += ` ${key}="${this.attributes[key]}"`;
            }
        }

        return `<${this.tagName}${parsedAttributes}>${this.innerHTML}</${this.tagName}>`;
    }

    private get innerHTML() {
        let content = '';

        for (let child of this.children) {
            if (child instanceof MailNode) {
                content += child.outerHTML;
            } else if (Array.isArray(child)) {
                for (const item of child) {
                    if (item instanceof MailNode) {
                        content += item.outerHTML;
                    } else {
                        content += item;
                    }
                }
            } else {
                content += child;
            }
        }

        return content;
    }
}

export abstract class MailComponent {
    styles = [];

    static createElement(tagName: string, attributes: Record<string, any> | null, ...children) {
        return new MailNode(tagName, attributes, children);
    }

    public abstract subject: string;

    async load() {}

    abstract render(child?: MailComponent): MailNode;
}