import { test, expect } from '@playwright/test';

test.describe('ManageMe - Zarządzanie Projektami', () => {
  test.beforeEach(async ({ page }) => {
    // Przygotowanie środowiska
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    page.on('dialog', dialog => dialog.accept());

    // Logowanie
    await page.fill('#loginEmail', 'admin@manageme.com');
    await page.click('#googleLoginBtn');
    await expect(page.locator('#app-view')).toBeVisible();
  });

  test('Pełny cykl życia: Projekt, Story i Zadanie', async ({ page }) => {
    const projectName = 'Projekt Kompleksowy ' + Date.now();
    const storyName = 'Historyjka Testowa';
    const taskName = 'Zadanie Testowe';

    // 1. Utworzenie projektu
    await page.fill('#name', projectName);
    await page.fill('#description', 'Opis projektu');
    await page.click('[data-testid="btn-submit-project"]');
    await expect(page.locator(`[data-testid="project-list"] h6:has-text("${projectName}")`)).toBeVisible();

    // Wybranie projektu (powinien być wybrany automatycznie, ale dla pewności klikamy)
    await page.locator(`[data-testid="project-list"] .project-info:has-text("${projectName}")`).click();

    // 2. Utworzenie historyjki
    await page.fill('#storyName', storyName);
    await page.fill('#storyDesc', 'Opis historyjki');
    await page.selectOption('#storyPriority', 'high');
    await page.click('[data-testid="btn-submit-story"]');
    
    const storyCard = page.locator(`.card:has-text("${storyName}")`);
    await expect(storyCard).toBeVisible();
    await expect(page.locator('#col-todo')).toContainText(storyName);

    // 3. Edycja historyjki
    await storyCard.locator('.edit-story-btn').click();
    const updatedStoryName = 'Zaktualizowana Historyjka';
    await page.fill('#storyName', updatedStoryName);
    await page.click('[data-testid="btn-submit-story"]');
    await expect(page.locator(`.card:has-text("${updatedStoryName}")`)).toBeVisible();

    // 4. Zmiana statusu historyjki
    const updatedStoryCard = page.locator(`.card:has-text("${updatedStoryName}")`);
    await updatedStoryCard.locator('.next-status-btn').click(); // todo -> doing
    await expect(page.locator('#col-doing')).toContainText(updatedStoryName);
    
    await updatedStoryCard.locator('.next-status-btn').click(); // doing -> done
    await expect(page.locator('#col-done')).toContainText(updatedStoryName);

    // 5. Utworzenie zadania (wymaga wybrania story)
    await updatedStoryCard.locator('.select-story-btn').click();
    await page.fill('#taskName', taskName);
    await page.fill('#taskDesc', 'Opis zadania');
    await page.fill('#taskTime', '4');
    await page.click('#addTaskBtn');
    
    const taskItem = page.locator(`[data-testid="task-card"]:has-text("${taskName}")`);
    await expect(taskItem).toBeVisible();

    // 6. Edycja zadania
    await taskItem.locator('[data-testid="btn-edit-task"]').click();
    const updatedTaskName = 'Zaktualizowane Zadanie';
    await page.fill('#taskName', updatedTaskName);
    await page.click('#addTaskBtn');
    await expect(page.locator(`[data-testid="task-card"]:has-text("${updatedTaskName}")`)).toBeVisible();

    // 7. Zmiana statusu zadania (Gotowe)
    const updatedTaskItem = page.locator(`[data-testid="task-card"]:has-text("${updatedTaskName}")`);
    await updatedTaskItem.locator('[data-testid="btn-done-task"]').click();
    // Po kliknięciu "Gotowe", przycisk powinien zniknąć (pojawia się ikona check-all)
    await expect(updatedTaskItem.locator('[data-testid="btn-done-task"]')).not.toBeVisible();

    // 8. Usunięcie zadania
    await updatedTaskItem.locator('[data-testid="btn-delete-task"]').click();
    await expect(page.locator(`[data-testid="task-card"]:has-text("${updatedTaskName}")`)).not.toBeVisible();

    // POWRÓT DO WIDOKU STORIES (inaczej karty story są ukryte)
    await page.click('button:has-text("Powrót do Stories")');

    // 9. Usunięcie historyjki
    await updatedStoryCard.locator('.delete-story-btn').click();
    await expect(page.locator(`.card:has-text("${updatedStoryName}")`)).not.toBeVisible();

    // 10. Usunięcie projektu
    await page.locator(`.list-group-item:has(h6:has-text("${projectName}")) .delete-btn`).click();
    await expect(page.locator(`[data-testid="project-list"] h6:has-text("${projectName}")`)).not.toBeVisible();
  });
});
