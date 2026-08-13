-- V9__update_shift_swap_request_columns.sql

ALTER TABLE shift_swap_request RENAME COLUMN shift_id TO from_shift_id;
ALTER TABLE shift_swap_request ADD COLUMN to_shift_id UUID REFERENCES shift(id);
