-- CreateTable
CREATE TABLE "Character" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "strength" INTEGER NOT NULL DEFAULT 5,
    "agility" INTEGER NOT NULL DEFAULT 5,
    "endurance" INTEGER NOT NULL DEFAULT 5,
    "intelligence" INTEGER NOT NULL DEFAULT 5,
    "hp" REAL NOT NULL DEFAULT 100,
    "maxHp" REAL NOT NULL DEFAULT 100,
    "arrMap" TEXT DEFAULT '100-100',
    "inventory" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "class" TEXT,
    "description" TEXT,
    "rarity" TEXT DEFAULT 'common',
    "strength" INTEGER NOT NULL DEFAULT 0,
    "agility" INTEGER NOT NULL DEFAULT 0,
    "endurance" INTEGER NOT NULL DEFAULT 0,
    "intelligence" INTEGER NOT NULL DEFAULT 0,
    "patk" INTEGER NOT NULL DEFAULT 0,
    "matk" INTEGER NOT NULL DEFAULT 0,
    "pdef" INTEGER NOT NULL DEFAULT 0,
    "mdef" INTEGER NOT NULL DEFAULT 0,
    "img" TEXT
);

-- CreateTable
CREATE TABLE "NPC" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "attack" INTEGER NOT NULL DEFAULT 10,
    "armor" INTEGER NOT NULL DEFAULT 0,
    "dodge" INTEGER NOT NULL DEFAULT 0,
    "elite" INTEGER NOT NULL DEFAULT 0,
    "drop_main" INTEGER,
    "interaction" TEXT,
    "avatar" TEXT
);

-- CreateTable
CREATE TABLE "Dialog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parent" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "conditions" TEXT
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reward" TEXT
);
