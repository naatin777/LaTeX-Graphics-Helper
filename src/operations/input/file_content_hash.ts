import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

export async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

export async function filesHaveEqualContents(firstPath: string, secondPath: string): Promise<boolean> {
  const [firstStat, secondStat] = await Promise.all([stat(firstPath), stat(secondPath)]);

  if (firstStat.size !== secondStat.size) {
    return false;
  }

  const [firstHash, secondHash] = await Promise.all([hashFile(firstPath), hashFile(secondPath)]);
  return firstHash === secondHash;
}
