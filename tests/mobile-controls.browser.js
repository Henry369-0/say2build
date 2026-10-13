// Reusable Playwright CLI browser regression. Start Say2Build, open its URL in
// an isolated CLI session, then run:
// playwright-cli -s=say2build-mobile run-code --filename=tests/mobile-controls.browser.js
// This function uses a fresh browser context and closes it after the checks.
async (page) => {
  const home = new URL(page.url());
  home.search = '';
  home.hash = '';
  const context = await page.context().browser().newContext({ viewport: { width: 1280, height: 900 }, isMobile: true, hasTouch: true });
  const browserPage = await context.newPage();
  const errors = [];
  browserPage.on('pageerror', (error) => errors.push(error.message));
  await browserPage.route('**/api/brain', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"No-key browser regression"}' }));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const storage = () => browserPage.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)])));
  const noOverflow = async (label) => {
    const metrics = await browserPage.evaluate(() => ({ width: innerWidth, root: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    assert(metrics.root <= metrics.width && metrics.body <= metrics.width, `${label}: horizontal overflow ${JSON.stringify(metrics)}`);
    return metrics;
  };
  const target = async (name, { mobile = true } = {}) => {
    const button = browserPage.getByRole('button', { name, exact: true });
    await button.waitFor({ state: 'visible', timeout: 1500 });
    const box = await button.boundingBox();
    const width = browserPage.viewportSize().width;
    assert(box && box.x >= 0 && box.x + box.width <= width + 1, `${name}: button is outside the viewport`);
    if (mobile) assert(box.height >= 44, `${name}: touch target is shorter than 44px`);
    return button;
  };

  try {
    await browserPage.goto(home.href);
    await browserPage.getByRole('textbox', { name: '你想做什么？', exact: true }).fill('我想做一个分享学习资料的小网站。');
    await browserPage.getByRole('button', { name: '开始成型', exact: true }).click();
    await browserPage.locator('.workspace-topbar').waitFor();
    await browserPage.locator('#pending-message').waitFor({ state: 'hidden' });
    await browserPage.locator('.demo-badge').first().waitFor();
    assert(await browserPage.evaluate(() => !JSON.parse(localStorage.getItem('say2build.settings.v1') || '{}').deepseekKey), 'Demo setup unexpectedly has a key');
    const projectUrl = browserPage.url();
    // Setup returns to the landing page; assertions below use accessible names.
    await browserPage.locator('.workspace-topbar [data-action="home"]').click();
    const cases = [];

    for (const width of [320, 390]) {
      await browserPage.setViewportSize({ width, height: 844 });
      await browserPage.goto(home.href);
      const importButton = await target('导入项目');
      await target('Say2Build 首页');
      const settingsButton = await target('AI 设置');
      const newButton = await target('开始新项目');
      const landing = await noOverflow(`${width}px landing`);

      await settingsButton.click();
      await browserPage.getByRole('heading', { name: 'AI 接入设置', exact: true }).waitFor();
      await browserPage.getByRole('button', { name: '关闭', exact: true }).click();
      await browserPage.getByRole('dialog').waitFor({ state: 'hidden' });
      await newButton.click();
      assert(await browserPage.getByRole('textbox', { name: '你想做什么？', exact: true }).evaluate((el) => el === document.activeElement), 'Start new project did not focus the idea field');

      const before = await storage();
      await importButton.click();
      await browserPage.getByRole('heading', { name: '导入已有项目', exact: true }).waitFor();
      await browserPage.locator('#project-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
      await browserPage.locator('#toast-root .toast').last().waitFor({ state: 'visible' });
      assert((await browserPage.locator('#toast-root .toast').last().textContent()).trim().length > 0, 'Malformed JSON import did not show an error toast');
      assert(await storage() === before, 'Malformed JSON import changed localStorage');
      await browserPage.locator('#project-file').setInputFiles({ name: 'incomplete-project.json', mimeType: 'application/json', buffer: Buffer.from('{"state":{"schemaVersion":"1.0","projectId":"incomplete-mobile"}}') });
      await browserPage.locator('#toast-root').getByText(/这个项目文件不完整或格式错误，已有项目未改动。/).waitFor({ state: 'visible' });
      assert(await storage() === before, 'Rejected JSON import changed localStorage');
      await noOverflow(`${width}px rejected import`);
      assert(await browserPage.getByRole('dialog').isVisible(), 'Rejected import unexpectedly closed the dialog');
      await browserPage.getByRole('button', { name: '关闭', exact: true }).click();
      await browserPage.getByRole('dialog').waitFor({ state: 'hidden' });

      await browserPage.goto(projectUrl);
      await browserPage.locator('.workspace-topbar').waitFor();
      await target('Say2Build 首页');
      await target('新建项目');
      const exportButton = await target('导出项目');
      const workspaceSettings = await target('AI 设置');
      const workspace = await noOverflow(`${width}px workspace`);
      await workspaceSettings.click();
      await browserPage.getByRole('heading', { name: 'AI 接入设置', exact: true }).waitFor();
      assert((await browserPage.locator('.settings-current').textContent()).includes('演示模式'), 'Workspace AI settings did not expose the current mode');
      await browserPage.getByRole('button', { name: '关闭', exact: true }).click();
      await exportButton.click();
      await browserPage.getByRole('heading', { name: '导出项目', exact: true }).waitFor();
      const downloaded = browserPage.waitForEvent('download');
      await browserPage.getByRole('button', { name: 'say2build.project.json 之后可恢复', exact: true }).click();
      const download = await downloaded;
      assert(download.suggestedFilename().endsWith('.say2build.project.json'), 'JSON export did not produce a project download');
      assert(await download.failure() === null, 'Project export download failed');
      await browserPage.getByRole('button', { name: '关闭', exact: true }).click();
      await (await target('新建项目')).click();
      await browserPage.getByRole('textbox', { name: '你想做什么？', exact: true }).waitFor();
      await browserPage.getByRole('button', { name: 'Say2Build 首页', exact: true }).click();
      assert(!new URL(browserPage.url()).searchParams.has('project'), 'Home control did not return to the landing route');
      await browserPage.goto(projectUrl);
      await (await target('Say2Build 首页')).click();
      await browserPage.getByRole('textbox', { name: '你想做什么？', exact: true }).waitFor();
      cases.push({ width, landing, workspace, malformedAndIncompleteImportsRejectedWithToast: true, storageUnchanged: true, dialogClosed: true, workspaceControlsNamedAndClickable: true, currentAIModeAccessible: true, exportDownloaded: true });
    }

    await browserPage.setViewportSize({ width: 1280, height: 900 });
    await browserPage.goto(home.href);
    await target('AI 设置', { mobile: false });
    await target('导入项目', { mobile: false });
    await target('开始新项目', { mobile: false });
    const desktopLanding = await noOverflow('Desktop landing');
    await browserPage.goto(projectUrl);
    await target('Say2Build 首页', { mobile: false });
    await target('新建项目', { mobile: false });
    await target('导出项目', { mobile: false });
    const desktopWorkspace = await noOverflow('Desktop workspace');
    assert(errors.length === 0, `Browser page errors: ${errors.join('; ')}`);
    return { cases, desktopLanding, desktopWorkspace, demoWithoutKey: true, pageErrors: errors };
  } finally {
    await context.close();
  }
}
