// Routed web app with page-scoped API/session fixtures; no real backend writes.
async (page) => {
  const checks = [];
  const requests = [];
  const errors = [];
  const expect = (condition, name) => {
    if (!condition) throw new Error(name);
    checks.push(name);
  };
  const onError = (error) => errors.push(error.message);
  page.on("pageerror", onError);
  const storeId = "11111111-1111-4111-8111-111111111111";
  const store = {
    id: storeId,
    name: "MOCK · Oak & Moss",
    category: "FOOD_BEVERAGE",
  };
  const shifts = [
    {
      id: "s1",
      shiftDate: "2026-10-20",
      startTime: "07:00",
      endTime: "15:00",
      requiredStaff: 2,
      shiftAssignments: [
        { staffId: "e1", staffName: "Linh Nguyễn", skillName: "Pha chế" },
        { staffId: "e2", staffName: "Minh Trần", skillName: "Thu ngân" },
      ],
    },
    {
      id: "s2",
      shiftDate: "2026-10-20",
      startTime: "09:00",
      endTime: "17:00",
      requiredStaff: 1,
      shiftAssignments: [
        { staffId: "e3", staffName: "An Lê", skillName: "Phục vụ" },
      ],
    },
    {
      id: "s3",
      shiftDate: "2026-10-19",
      startTime: "07:00",
      endTime: "15:00",
      requiredStaff: 1,
      shiftAssignments: [
        { staffId: "e1", staffName: "Linh Nguyễn", skillName: "Pha chế" },
      ],
    },
  ];
  const attendance = [
    {
      id: "a1",
      shiftDate: "2026-10-20",
      staffId: "e1",
      staffName: "Linh Nguyễn",
      checkInTime: "2026-10-20T00:05:00Z",
      status: "PRESENT",
    },
    {
      id: "a2",
      shiftDate: "2026-10-20",
      staffId: "e2",
      staffName: "Minh Trần",
      checkInTime: "2026-10-20T01:15:00Z",
      status: "LATE",
    },
  ];
  let leave = [
    {
      id: "l1",
      staffName: "Mai Phạm",
      reason: "Nghỉ phép năm",
      startDate: "2026-10-21",
      endDate: "2026-10-22",
    },
  ];
  let mode = "populated";
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("http://127.0.0.1:3000/login");
  await page.unroute("**/api/**");
  if (page.routeWebSocket)
    await page.routeWebSocket("**/ws/**", (ws) => ws.close());
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    requests.push({ method: req.method(), path });
    const respond = (json) => route.fulfill({ status: 200, json });
    if (path === "/api/stores" || path === "/api/stores/directory")
      return respond({ content: [store] });
    if (path === "/api/users")
      return respond({
        content: [
          { id: "e1", fullName: "Linh Nguyễn" },
          { id: "e2", fullName: "Minh Trần" },
          { id: "e3", fullName: "An Lê" },
        ],
      });
    if (path.endsWith("/layout"))
      return respond({ length: 22.2, width: 14.22, height: 3.5 });
    if (path.endsWith("/zones") || path.endsWith("/skills")) return respond([]);
    if (path.endsWith("/shifts"))
      return respond(mode === "populated" ? shifts : []);
    if (path.endsWith("/attendance"))
      return respond(mode === "populated" ? attendance : []);
    if (path.endsWith("/leave-requests") && req.method() === "GET")
      return respond(mode === "populated" ? leave : []);
    if (path.includes("/leave-requests/") && req.method() !== "GET") {
      leave = [];
      return respond({});
    }
    if (
      path.endsWith("/swaps") ||
      path.endsWith("/attendance-adjustments") ||
      path === "/api/requests"
    )
      return respond([]);
    if (path.endsWith("/unread-count")) return respond({ unreadCount: 0 });
    if (path === "/api/users/me/notifications") return respond([]);
    return respond([]);
  });
  await page.evaluate((id) => {
    localStorage.clear();
    Object.entries({
      accessToken: "PLAYWRIGHT_MOCK_NOT_A_REAL_SESSION",
      userRole: "MANAGER",
      userName: "Nguyễn Việt Quốc",
      selectedStoreId: id,
      "shiftsync-theme": "light",
      "shiftsync-style": "warm",
      "shiftsync-nav-style": "contrast",
    }).forEach(([key, value]) => localStorage.setItem(key, value));
  }, storeId);
  const fit = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.querySelector(".db").getBoundingClientRect().right <=
          innerWidth,
    );
  try {
    await page.goto("http://127.0.0.1:3000/dashboard");
    await page
      .locator(".db-who b")
      .filter({ hasText: "Linh Nguyễn" })
      .waitFor();
    expect(await fit(), "Desktop dashboard has no horizontal overflow");
    expect(
      (await page.locator(".db-metric-item").count()) === 4,
      "Four operating metrics render",
    );
    expect(
      (await page.locator(".db-metric-schedule").innerText()).includes("3"),
      "Assignment metric shows real rows",
    );
    expect(
      (await page.locator(".db-metric-requests").innerText()).includes("1"),
      "Pending count uses API fixture",
    );
    expect(
      (await page.locator(".db-chart-empty").count()) === 0,
      "Weekly chart renders when data exists",
    );
    expect(
      (await page.locator(".db-request-row").count()) === 1,
      "Approval queue renders real request",
    );
    expect(
      (await page.locator(".db-attendance-row").count()) === 2,
      "Attendance feed renders records",
    );
    expect(
      (await page
        .locator('a.db-action-btn[href="/schedule?view=3d"]')
        .count()) === 1,
      "3D shortcut reaches applied store route",
    );
    await page.screenshot({
      path: "D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/dashboard-redesign-populated.png",
      fullPage: true,
    });
    await page
      .getByRole("combobox", { name: "Lọc theo nhân viên" })
      .selectOption("e1");
    await page.waitForFunction(
      () => document.querySelectorAll(".db-who b").length === 1,
    );
    expect(
      (await page.locator(".db-who b").count()) === 1,
      "Employee filter narrows the shift timeline",
    );
    await page
      .getByRole("combobox", { name: "Lọc theo nhân viên" })
      .selectOption("");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Xuất báo cáo" }).click(),
    ]);
    expect(
      download.suggestedFilename().endsWith(".csv"),
      "CSV export remains available",
    );
    await page.getByRole("button", { name: "Sơ đồ mặt bằng" }).click();
    expect(
      await page.locator(".db-spatial-card").isVisible(),
      "Spatial tab shows store schematic",
    );
    await page.getByRole("button", { name: "Dạng Timeline" }).click();
    expect(
      await page.locator(".db-tl").isVisible(),
      "Timeline tab restores shift rows",
    );
    await page.getByRole("button", { name: "Số ca theo vị trí" }).click();
    expect(
      await page
        .getByRole("img", { name: "Số ca được phân công theo vị trí" })
        .isVisible(),
      "Assignment chart tab renders",
    );
    await page.getByRole("button", { name: "Giờ làm việc" }).click();
    expect(
      await page
        .getByRole("img", { name: "Giờ lịch xếp và giờ thực làm theo ngày" })
        .isVisible(),
      "Hours chart tab restores",
    );
    await page
      .getByRole("button", { name: "Duyệt Mai Phạm xin nghỉ phép" })
      .click();
    await page.locator(".db-request-row").waitFor({ state: "detached" });
    expect(
      requests.some(
        (r) => r.method !== "GET" && r.path.includes("/leave-requests/l1"),
      ),
      "Approval still uses existing mocked mutation route",
    );
    await page.getByRole("button", { name: "Ngày sau" }).click();
    expect(
      (await page.locator(".db-schedule-card h2").innerText()).includes(
        "21/10",
      ),
      "Date navigation updates visible schedule heading",
    );
    await page.getByRole("button", { name: "Hôm nay" }).click();
    expect(
      (await page.locator(".db-schedule-card h2").innerText()).includes(
        "hôm nay",
      ),
      "Today control returns to current day",
    );
    mode = "empty";
    await page.reload();
    await page.locator(".db-chart-empty").waitFor();
    expect(
      await page.getByText("Chưa có dữ liệu cho biểu đồ này").isVisible(),
      "Zero-data chart provides useful empty state",
    );
    expect(
      (await page.locator(".db-metric-schedule").innerText()).includes(
        "Chưa có ca trong ngày",
      ),
      "No shifts are not reported as 100% coverage",
    );
    await page.screenshot({
      path: "D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/dashboard-redesign-empty-wide.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(await fit(), "Laptop dashboard has no horizontal overflow");
    await page.evaluate(() => localStorage.setItem("shiftsync-theme", "dark"));
    await page.reload();
    await page.waitForFunction(
      () => document.documentElement.dataset.theme === "dark",
    );
    expect(await fit(), "Dark theme retains responsive layout");
    await page.screenshot({
      path: "D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/dashboard-redesign-dark.png",
      fullPage: true,
    });
    await page.evaluate(() => localStorage.setItem("shiftsync-theme", "light"));
    await page.reload();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await fit(), "Mobile dashboard has no horizontal overflow");
    expect(
      (await page.locator(".db-metric-item").count()) === 4,
      "Mobile retains all metrics",
    );
    await page.screenshot({
      path: "D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/dashboard-redesign-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1920, height: 1080 });
    mode = "populated";
    await page.reload();
    await page
      .locator(".db-who b")
      .filter({ hasText: "Linh Nguyễn" })
      .waitFor();
    expect(errors.length === 0, "No uncaught browser errors");
    return {
      checks,
      errors,
      writes: requests.filter((r) => r.method !== "GET"),
      viewport: page.viewportSize(),
    };
  } finally {
    page.off("pageerror", onError);
  }
}
