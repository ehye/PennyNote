CREATE UNIQUE INDEX category_sibling_name ON categories (coalesce(parent_id, ''), lower(name));
--> statement-breakpoint
CREATE UNIQUE INDEX account_name_casefold ON accounts (currency, lower(name));
--> statement-breakpoint
CREATE INDEX entries_date ON entries(date);
--> statement-breakpoint
CREATE INDEX entries_account ON entries(account_id);
--> statement-breakpoint
CREATE INDEX entries_destination ON entries(destination_id);
--> statement-breakpoint
CREATE TRIGGER category_insert_valid BEFORE INSERT ON categories BEGIN
  SELECT CASE WHEN lower(NEW.name) = 'transfer' OR length(trim(NEW.name)) = 0
    OR (NEW.parent_id IS NULL AND NEW.icon <> '')
    OR (NEW.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.parent_id AND parent_id IS NULL))
    THEN RAISE(ABORT, 'invalid category') END;
END;
--> statement-breakpoint
CREATE TRIGGER category_update_valid BEFORE UPDATE ON categories BEGIN
  SELECT CASE WHEN lower(NEW.name) = 'transfer' OR length(trim(NEW.name)) = 0
    OR (NEW.parent_id IS NULL) <> (OLD.parent_id IS NULL)
    OR (NEW.parent_id IS NULL AND NEW.icon <> '')
    OR (NEW.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.parent_id AND parent_id IS NULL))
    THEN RAISE(ABORT, 'invalid category') END;
END;
--> statement-breakpoint
CREATE TRIGGER category_delete_valid BEFORE DELETE ON categories BEGIN
  SELECT CASE WHEN EXISTS (SELECT 1 FROM categories WHERE parent_id = OLD.id)
    THEN RAISE(ABORT, 'category has children') END;
END;
--> statement-breakpoint
CREATE TRIGGER account_immutable BEFORE UPDATE ON accounts BEGIN
  SELECT CASE WHEN NEW.type <> OLD.type OR NEW.currency <> OLD.currency OR NEW.id <> OLD.id
    THEN RAISE(ABORT, 'account type and currency are immutable') END;
END;
--> statement-breakpoint
CREATE TRIGGER entry_zero_adjustment BEFORE INSERT ON entries
WHEN NEW.type = 'Adjustment' AND NEW.amount = 0 BEGIN
  SELECT RAISE(IGNORE);
END;
--> statement-breakpoint
CREATE TRIGGER entry_insert_valid BEFORE INSERT ON entries BEGIN
  SELECT CASE WHEN NEW.type NOT IN ('Expense', 'Income', 'Transfer', 'Adjustment')
    OR NEW.amount <> cast(NEW.amount AS INTEGER) OR abs(NEW.amount) > 1000000000000
    OR (NEW.type <> 'Adjustment' AND NEW.amount <= 0)
    OR (NEW.type IN ('Expense', 'Income') AND (NEW.destination_id IS NOT NULL OR NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id AND parent_id IS NOT NULL)))
    OR (NEW.type = 'Transfer' AND (NEW.category_id IS NOT NULL OR NEW.account_id = NEW.destination_id OR NOT EXISTS (SELECT 1 FROM accounts a JOIN accounts b ON a.currency = b.currency WHERE a.id = NEW.account_id AND b.id = NEW.destination_id)))
    OR (NEW.type = 'Adjustment' AND (NEW.category_id IS NOT NULL OR NEW.destination_id IS NOT NULL OR NEW.balance_before IS NULL OR NEW.balance_after IS NULL OR NEW.balance_after - NEW.balance_before <> NEW.amount))
    THEN RAISE(ABORT, 'invalid ledger record') END;
END;
--> statement-breakpoint
CREATE TRIGGER entry_update_valid BEFORE UPDATE ON entries BEGIN
  SELECT CASE WHEN OLD.type = 'Adjustment' THEN RAISE(ABORT, 'adjustment is read-only') END;
  SELECT CASE WHEN NEW.type NOT IN ('Expense', 'Income', 'Transfer')
    OR NEW.amount <= 0 OR NEW.amount <> cast(NEW.amount AS INTEGER) OR NEW.amount > 1000000000000
    OR (NEW.type IN ('Expense', 'Income') AND (NEW.destination_id IS NOT NULL OR NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id AND parent_id IS NOT NULL)))
    OR (NEW.type = 'Transfer' AND (NEW.category_id IS NOT NULL OR NEW.account_id = NEW.destination_id OR NOT EXISTS (SELECT 1 FROM accounts a JOIN accounts b ON a.currency = b.currency WHERE a.id = NEW.account_id AND b.id = NEW.destination_id)))
    THEN RAISE(ABORT, 'invalid ledger record') END;
END;
--> statement-breakpoint
CREATE TRIGGER entry_delete_valid BEFORE DELETE ON entries WHEN OLD.type = 'Adjustment' BEGIN
  SELECT RAISE(ABORT, 'adjustment is read-only');
END;
--> statement-breakpoint
CREATE TRIGGER entry_insert_version AFTER INSERT ON entries BEGIN
  UPDATE accounts SET version = version + 1 WHERE id = NEW.account_id OR id = NEW.destination_id;
END;
--> statement-breakpoint
CREATE TRIGGER entry_update_version AFTER UPDATE ON entries BEGIN
  UPDATE accounts SET version = version + 1 WHERE id IN (NEW.account_id, NEW.destination_id, OLD.account_id, OLD.destination_id);
END;
--> statement-breakpoint
CREATE TRIGGER entry_delete_version AFTER DELETE ON entries BEGIN
  UPDATE accounts SET version = version + 1 WHERE id = OLD.account_id OR id = OLD.destination_id;
END;
--> statement-breakpoint
-- This trigger computes the live balance and inserts the delta in the same SQL
-- statement as the account edit. The optimistic version guard lives in the UPDATE.
CREATE TRIGGER account_adjustment AFTER UPDATE OF balance_target ON accounts
WHEN NEW.balance_target IS NOT NULL BEGIN
  INSERT INTO entries (id, type, date, account_id, amount, notes, balance_before, balance_after, version, created_at)
  SELECT lower(hex(randomblob(16))), 'Adjustment', NEW.balance_date, NEW.id,
    NEW.balance_target - current_balance, 'Balance change', current_balance, NEW.balance_target, 1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  FROM (SELECT coalesce(sum(CASE
    WHEN type = 'Transfer' THEN CASE WHEN destination_id = NEW.id THEN amount ELSE -amount END
    WHEN type = 'Expense' THEN -amount ELSE amount END), 0) AS current_balance
    FROM entries WHERE date <= NEW.balance_date AND (account_id = NEW.id OR destination_id = NEW.id));
  UPDATE accounts SET balance_target = NULL WHERE id = NEW.id;
END;
--> statement-breakpoint
INSERT INTO categories (id, parent_id, name, icon) VALUES
  ('food', NULL, 'Food', ''), ('transport', NULL, 'Transport', ''), ('living', NULL, 'Living', ''), ('income', NULL, 'Income', '');
--> statement-breakpoint
INSERT INTO categories (id, parent_id, name, icon) VALUES
  ('food-general', 'food', 'General', '🍽️'), ('food-groceries', 'food', 'Groceries', '🛒'),
  ('transport-general', 'transport', 'General', '🚆'), ('living-general', 'living', 'General', '🏠'),
  ('income-salary', 'income', 'Salary', '💼'), ('income-general', 'income', 'General', '💰');
