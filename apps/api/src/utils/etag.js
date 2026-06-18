import { createHash } from 'crypto';

export function makeETag(body) {
  const hash = createHash('sha1').update(body).digest('hex').slice(0, 16);
  return `W/"${hash}"`;
}
