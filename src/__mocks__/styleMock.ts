type StyleModule = Record<string, string>;

const styleStub = new Proxy<StyleModule>({} as StyleModule, {
  get: (_target, prop: string | symbol) => (typeof prop === 'string' ? prop : prop.toString()),
}) as StyleModule;

export = styleStub;
