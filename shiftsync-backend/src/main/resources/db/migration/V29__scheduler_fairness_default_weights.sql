ALTER TABLE scheduler_configuration ALTER COLUMN fairness_weight SET DEFAULT 0.200;
ALTER TABLE scheduler_configuration ALTER COLUMN skill_weight SET DEFAULT 0.250;
ALTER TABLE scheduler_configuration ALTER COLUMN hour_weight SET DEFAULT 0.200;
ALTER TABLE scheduler_configuration ALTER COLUMN rest_time_weight SET DEFAULT 0.150;
ALTER TABLE scheduler_configuration ALTER COLUMN availability_weight SET DEFAULT 0.200;