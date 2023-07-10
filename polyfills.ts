declare global {
	interface String {
		german(translation: string): string;
	}
}

if (!''.german) {
	Object.defineProperty(String.prototype, 'german', {
		get() {
			return () => this;
		},
		configurable: true
	});
}

export {};