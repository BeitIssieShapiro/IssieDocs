import { PromiseAllProgress } from '../src/utils';

jest.mock('../src/log', () => ({ trace: jest.fn() }));

describe('archive progress', () => {
  it('reports completed work while returning results in input order', async () => {
    let completeFirst;
    const first = new Promise(resolve => { completeFirst = resolve; });
    const progress = jest.fn();
    const result = PromiseAllProgress([first, Promise.resolve('second')], progress);
    await Promise.resolve();
    expect(progress.mock.calls).toEqual([[0], [50]]);
    completeFirst('first');
    await expect(result).resolves.toEqual(['first', 'second']);
    expect(progress.mock.calls).toEqual([[0], [50], [100]]);
  });

  it('propagates archive failures through the returned promise', async () => {
    const error = new Error('Archive creation failed');
    await expect(PromiseAllProgress([Promise.reject(error)], jest.fn())).rejects.toBe(error);
  });

  it('finishes an empty backup at 100 percent', async () => {
    const progress = jest.fn();
    await expect(PromiseAllProgress([], progress)).resolves.toEqual([]);
    expect(progress.mock.calls).toEqual([[0], [100]]);
  });
});
