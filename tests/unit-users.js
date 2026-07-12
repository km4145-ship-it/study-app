'use strict';
// cloud-sync.js の mergeUsers を抽出して、ユーザー/キャラのクロス端末マージ（union）を検証。
const fs = require('fs');
const path = require('path');
const { makeChecker, ROOT } = require('./lib/assert');
const c = makeChecker('unit-users');

const src = fs.readFileSync(path.join(ROOT, 'cloud-sync.js'), 'utf8');
const s = src.indexOf('function mergeUsers(');
const endM = 'slice(0,8)); }catch(e){ return b||a; } }';
const e = src.indexOf(endM, s) + endM.length;
const mergeUsers = (new Function(src.slice(s, e) + '\nreturn mergeUsers;'))();

const u1 = { id: 'u1', name: 'ユーザー1', char: 'shiba', admin: true, startYear: 2019 };
const hanako = { id: 'uA1', name: 'はなこ', char: 'girl', admin: false, startYear: 2020 };

const r1 = JSON.parse(mergeUsers(JSON.stringify([u1]), JSON.stringify([u1, hanako])));
c.ok('B: 新規ユーザーが出現', r1.some((u) => u.id === 'uA1'));
c.ok('B: char=girl 保持', (r1.find((u) => u.id === 'uA1') || {}).char === 'girl');
c.ok('B: 既存u1保持', r1.some((u) => u.id === 'u1'));

const r2 = JSON.parse(mergeUsers(JSON.stringify([u1, hanako]), JSON.stringify([u1])));
c.ok('A: ローカルの新規ユーザーが古いクラウドとのマージで消えない', r2.some((u) => u.id === 'uA1' && u.char === 'girl'));

const r3 = JSON.parse(mergeUsers(JSON.stringify([{ ...hanako, char: 'boy' }]), JSON.stringify([{ ...hanako, char: 'fox' }])));
c.ok('同時char編集でも1人維持・crashなし', r3.length === 1 && ['boy', 'fox'].includes(r3[0].char));

const r4 = JSON.parse(mergeUsers(JSON.stringify([{ ...u1, bioCreds: ['credA'] }]), JSON.stringify([{ ...u1, bioCreds: ['credB'] }])));
c.ok('bioCreds 合算', r4[0].bioCreds.includes('credA') && r4[0].bioCreds.includes('credB'));

const taro = { id: 'uB1', name: 'たろう', char: 'boy', admin: false, startYear: 2021 };
const r5 = JSON.parse(mergeUsers(JSON.stringify([u1, taro]), JSON.stringify([u1, hanako])));
c.ok('両端末の新規ユーザーが両方残る(union)', r5.some((u) => u.id === 'uA1') && r5.some((u) => u.id === 'uB1'));
c.done();
