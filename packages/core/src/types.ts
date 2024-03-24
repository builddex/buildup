export type BuildItem<T extends object = object> = {
  name: string;
  builder?: string;
  deps?: string[];
} & { [key in keyof T]: T[key]; };

export interface BuildOptions {
  action: 'dev' | 'build';
  parallel?: boolean;
  [key: string]: unknown
}


export abstract class Builder<T extends object = object, DevRes = void, BuildRes = void> {


  /**
   * 开发命令执行
   *  > npx --yes @builddex/buildup dev
   * @param item
   * @param options
   */
  abstract dev(item: BuildItem<T>, options: BuildOptions): Promise<DevRes>;


  /**
   * 开发命令执行
   *  > npx --yes @builddex/buildup build
   * @param item
   * @param options
   */
  abstract build(item: BuildItem<T>, options: BuildOptions): Promise<BuildRes>;


}
