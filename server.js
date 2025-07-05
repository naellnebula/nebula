const express = require('express');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = 3000;
const BOT_TOKEN = '7631772970:AAHDKv5VAsaAbboyOl-gUBmMLWADs8-7Yto';
const OWNER_ID = 7466190629;

const bot = new Telegraf(BOT_TOKEN);

app.use(express.json());
app.use(express.static('.'));
app.use(cookieParser());

const userDBFile = './database/users.json';
const ressFile = './database/ress.json';
if (!fs.existsSync(userDBFile)) fs.writeFileSync(userDBFile, JSON.stringify([{ username: "dimasz", password: "test" }]));
if (!fs.existsSync(ressFile)) fs.writeFileSync(ressFile, JSON.stringify([]));

function loadUsers() {
  return JSON.parse(fs.readFileSync(userDBFile));
}
function saveUsers(users) {
  fs.writeFileSync(userDBFile, JSON.stringify(users, null, 2));
}
function loadRess() {
  return JSON.parse(fs.readFileSync(ressFile));
}
function saveRess(data) {
  fs.writeFileSync(ressFile, JSON.stringify(data, null, 2));
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const valid = users.find(u => u.username === username && u.password === password);
  if (valid) {
    res.cookie('login', username, { httpOnly: true });
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('login');
  res.sendStatus(200);
});

app.get('/check-login', (req, res) => {
  if (req.cookies.login) {
    res.json({ loggedIn: true, username: req.cookies.login });
  } else {
    res.json({ loggedIn: false });
  }
});

const dbFiles = {
  token: './database/token.json',
  password: './database/password.json',
  nomor: './database/nomor.json'
};

function loadData(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}
function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

['token', 'password', 'nomor'].forEach(type => {
  app.post(`/add-${type}`, (req, res) => {
    const list = loadData(dbFiles[type]);
    list.push(req.body.value);
    saveData(dbFiles[type], list);
    res.sendStatus(200);
  });

  app.get(`/get-${type}`, (req, res) => {
    const list = loadData(dbFiles[type]);
    res.json(list);
  });

  app.post(`/delete-${type}`, (req, res) => {
    let list = loadData(dbFiles[type]);
    list = list.filter(item => item !== req.body.value);
    saveData(dbFiles[type], list);
    res.sendStatus(200);
  });
});

// Melihat semua file JSON di folder /database
app.get('/database/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = `./database/${filename}.json`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File tidak ditemukan.' });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Gagal membaca file JSON.' });
  }
});

// === Telegram Bot Commands (Owner Only) ===
bot.use(async (ctx, next) => {
  if (!ctx.message || !ctx.message.text.startsWith('/')) return;

  const ress = loadRess();
  const isOwner = ctx.from.id === OWNER_ID;
  const isRess = ress.includes(String(ctx.from.id));

  if (!isOwner && !isRess) {
    return ctx.reply('❌ Anda tidak memiliki akses ke command bot ini.');
  }

  return next();
});

bot.command('create', ctx => {
  const [_, username, password] = ctx.message.text.split(' ');
  if (!username || !password) return ctx.reply('Format: /create <username> <password>');

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return ctx.reply('❌ Username sudah ada.');
  }

  users.push({ username, password });
  saveUsers(users);
  ctx.reply(`✅ Akun dibuat:\n👤 ${username}\n🔑 ${password}`);
});

bot.command('delakun', ctx => {
  const [_, username, password] = ctx.message.text.split(' ');
  if (!username || !password) return ctx.reply('Format: /delakun <username> <password>');

  let users = loadUsers();
  const awal = users.length;
  users = users.filter(u => !(u.username === username && u.password === password));
  saveUsers(users);

  ctx.reply(awal !== users.length ? '✅ Akun dihapus.' : '❌ Akun tidak ditemukan.');
});

bot.command('listakun', ctx => {
  const users = loadUsers();
  const msg = users.map((u, i) => `${i + 1}. ${u.username} - ${u.password}`).join('\n');
  ctx.reply(msg || 'Belum ada akun.');
});

bot.command('address', ctx => {
  const id = ctx.message.text.split(' ')[1];
  if (!id) return ctx.reply('Gunakan: /address <id>');
  const data = loadRess();
  if (!data.includes(id)) {
    data.push(id);
    saveRess(data);
    ctx.reply(`✅ Ditambahkan ke ress.`);
  } else {
    ctx.reply('❗ Sudah ada.');
  }
});

bot.command('delress', ctx => {
  const id = ctx.message.text.split(' ')[1];
  if (!id) return ctx.reply('Gunakan: /delress <id>');
  let data = loadRess();
  const awal = data.length;
  data = data.filter(item => item !== id);
  saveRess(data);
  ctx.reply(awal !== data.length ? '✅ Dihapus dari ress.' : '❌ ID tidak ditemukan.');
});

bot.command('listress', ctx => {
  const data = loadRess();
  ctx.reply(data.length ? data.join('\n') : 'Belum ada ress.');
});

bot.launch().then(() => {
  console.log('🤖 Telegram bot started');
});

app.listen(PORT, () => console.log(`🌐 Web server running on http://localhost:${PORT}`));