import { expect, test } from "@playwright/test";

test("demo-login mène au dashboard", async ({ page }) => {
  await page.goto("/api/demo-login");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.getByRole("heading", { name: "Vue d'ensemble" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Associations"),
  ).toBeVisible();
});

test("accès sans session redirige vers la connexion", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/login/);
});
