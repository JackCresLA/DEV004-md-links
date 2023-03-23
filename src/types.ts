export interface MDOptions {
  validate?: boolean;
  stats?: boolean;
}

export interface BaseLink {
  file: string;
  text: string;
  href: string;
}

export interface ValidatedLink extends BaseLink {
  status: number;
  ok: string;
}
