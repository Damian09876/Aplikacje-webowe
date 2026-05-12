import { test, expect } from '@playwright/test';

test.describe('ManageMe E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should handle project, story, and task lifecycle', async ({ page }) => {
    // 1. Login
    await page.fill('#loginEmail', 'admin@manageme.com');
    await page.click('#googleLoginBtn');
    await expect(page.locator('#user-info')).toContainText('admin');

    // 2. Create Project
    await page.fill('#name', 'E2E Project');
    await page.fill('#description', 'Project for E2E tests');
    await page.click('#addBtn');
    await expect(page.locator('#projects')).toContainText('E2E Project');

    // 3. Edit Project
    await page.locator('#projects .list-group-item:has-text("E2E Project") .edit-btn').click();
    await page.fill('#name', 'E2E Project Edited');
    await page.click('#addBtn');
    await expect(page.locator('#projects')).toContainText('E2E Project Edited');

    // 4. Select Project
    await page.locator('#projects .project-info:has-text("E2E Project Edited")').click();
    await expect(page.locator('#story-section')).toBeVisible();

    // 5. Create Story
    await page.fill('#storyName', 'E2E Story');
    await page.fill('#storyDesc', 'Story for E2E tests');
    await page.selectOption('#storyPriority', 'high');
    await page.click('#addStoryBtn');
    await expect(page.locator('.story-card')).toContainText('E2E Story');

    // 6. Edit Story
    await page.locator('.story-card:has-text("E2E Story") .edit-story-btn').click();
    await page.fill('#storyName', 'E2E Story Edited');
    await page.click('#addStoryBtn');
    await expect(page.locator('.story-card')).toContainText('E2E Story Edited');

    // 7. Change Story status
    await expect(page.locator('#col-todo')).toContainText('E2E Story Edited');
    await page.locator('.story-card:has-text("E2E Story Edited") .next-status-btn').click();
    await expect(page.locator('#col-doing')).toContainText('E2E Story Edited');

    // 8. Select Story to see tasks
    await page.locator('.story-card:has-text("E2E Story Edited") .select-story-btn').click();
    await expect(page.locator('button:has-text("Powrót do Stories")')).toBeVisible();

    // 9. Create Task
    await page.fill('#taskName', 'E2E Task');
    await page.fill('#taskDesc', 'Task for E2E tests');
    await page.fill('#taskTime', '5');
    await page.click('#addTaskBtn');
    await expect(page.locator('.card:has-text("E2E Task")')).toBeVisible();

    // 10. Edit Task
    await page.locator('.card:has-text("E2E Task") .edit-task-btn').click();
    await page.fill('#taskName', 'E2E Task Edited');
    await page.click('#addTaskBtn');
    await expect(page.locator('.card:has-text("E2E Task Edited")')).toBeVisible();

    // 11. Change Task status (Gotowe)
    await page.locator('.card:has-text("E2E Task Edited") .done-btn').click();
    await expect(page.locator('.card:has-text("E2E Task Edited") .bi-check-all')).toBeVisible();

    // 12. Delete Task
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.card:has-text("E2E Task Edited") .delete-task-btn').click();
    await expect(page.locator('.card:has-text("E2E Task Edited")')).not.toBeVisible();

    // 13. Back to Stories and Delete Story
    await page.locator('button:has-text("Powrót do Stories")').click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.story-card:has-text("E2E Story Edited") .delete-story-btn').click();
    await expect(page.locator('.story-card:has-text("E2E Story Edited")')).not.toBeVisible();

    // 14. Delete Project
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#projects .list-group-item:has-text("E2E Project Edited") .delete-btn').click();
    await expect(page.locator('#projects')).not.toContainText('E2E Project Edited');
  });
});
