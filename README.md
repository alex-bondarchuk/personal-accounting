# облік

Український мобільний застосунок для обліку витрат. Frontend працює без збірки, а дані можна синхронізувати з Supabase PostgreSQL.

## Локальний запуск

```bash
npm start
```

Після цього відкрий `http://localhost:4173`.

## Підключення Supabase

1. Створи безкоштовний проєкт у Supabase.
2. Відкрий `supabase/schema.sql` і виконай SQL у SQL Editor.
3. Відкрий Supabase Dashboard → Project Settings → API.
4. Заповни `url` та `anonKey` у `supabase-config.js`.
5. У Authentication → Providers увімкни Email.

У браузер можна додавати лише `anon` key. `service_role` key ніколи не можна комітити в Git або вставляти у frontend. Доступ до записів захищають RLS-політики: кожен користувач бачить і змінює лише власні витрати.

## GitHub → Railway

```bash
git init
git add .
git commit -m "Initial oblik app"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

У Railway обери **Deploy from GitHub Repo** і цей репозиторій. Railway запустить `npm start` через `server.mjs`, який використовує змінну `PORT`.

Для production у Railway додай Variables:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
```

Команда `npm start` автоматично генерує `supabase-config.js` з цих змінних перед запуском. `anon` key не є секретом, але RLS-політики мають залишатися увімкненими. `service_role` key у Railway або браузер додавати не можна.
