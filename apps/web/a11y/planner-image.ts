// biome-ignore lint/correctness/noUnresolvedImports: Playwright re-exports Page through its type declarations; TypeScript verifies this export.
import type { Page } from '@playwright/test';

export const createPlannerImage = (page: Page, week = '2026-W01') =>
  page.evaluate((printedWeek) => {
    const width = 500;
    const height = 300;
    const textLeft = 24;
    const headingTop = 48;
    const entryTop = 100;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const drawing = canvas.getContext('2d');
    if (drawing) {
      drawing.fillStyle = 'white';
      drawing.fillRect(0, 0, canvas.width, canvas.height);
      drawing.fillStyle = 'black';
      drawing.font = '24px sans-serif';
      drawing.fillText(`${printedWeek} — Monday`, textLeft, headingTop);
      drawing.fillText('Math: Exercises 1–3', textLeft, entryTop);
    }
    return canvas.toDataURL('image/png');
  }, week);
