-- Players created before the game spoke English got the default name "Arconte" + the first four
-- characters of their wallet. Rename only those untouched defaults to the new "Archon" pattern.
UPDATE "players" SET "name" = 'Archon ' || left("wallet", 4) WHERE "name" = 'Arconte ' || left("wallet", 4);
