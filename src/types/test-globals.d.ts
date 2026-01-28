declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function beforeAll(fn: () => void): void;
declare function afterAll(fn: () => void): void;
declare function expect(actual: any): {
    toBe(expected: any): void;
    toBeNull(): void;
    toContain(expected: string): void;
    not: {
        toBe(expected: any): void;
        toBeNull(): void;
        toContain(expected: string): void;
    };
};

