# Git workflow

1. `git pull origin main`
2. `git switch -c feature/<ten-module>`
3. Code và commit theo tính năng nhỏ.
4. `git push -u origin feature/<ten-module>`
5. Mở Pull Request vào `main`.
6. Chờ review và xử lý conflict trước khi merge.

Không commit `.env`, mật khẩu, token hoặc dữ liệu cá nhân.
