declare module 'screenshot-desktop' {
  function screenshot(options: { format: 'png' | 'jpg' }): Promise<Buffer>;
  export = screenshot;
}
