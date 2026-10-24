import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidId,
  isAssignmentObject,
  isStaffObject,
  getStaffId,
  getAssignmentId,
  areSameStaff,
  areSameAssignment,
} from './staffIdentity.js';

describe('W-02: staffIdentity Helper Tests', () => {
  const staffUserId = 'c28d7e9b-3a45-4df1-8e01-112233445566';
  const assignmentId = 'a1111111-2222-3333-4444-555555555555';

  it('isValidId validates non-empty identifiers properly', () => {
    assert.equal(isValidId(staffUserId), true);
    assert.equal(isValidId('123'), true);
    assert.equal(isValidId(101), true);
    assert.equal(isValidId(''), false);
    assert.equal(isValidId('   '), false);
    assert.equal(isValidId(null), false);
    assert.equal(isValidId(undefined), false);
    assert.equal(isValidId('null'), false);
    assert.equal(isValidId('undefined'), false);
    assert.equal(isValidId('[object Object]'), false);
  });

  it('identifies pure Staff/User object vs ShiftAssignmentDTO', () => {
    const pureStaff = {
      id: staffUserId,
      fullName: 'Tran Van Bao',
      email: 'bao.tran@shiftsync.com',
      systemRole: 'STAFF',
    };

    const shiftAssignment = {
      id: assignmentId,
      staffId: staffUserId,
      shiftId: 'shift-99',
      zoneId: 'zone-barista',
      staffName: 'Tran Van Bao',
    };

    assert.equal(isStaffObject(pureStaff), true);
    assert.equal(isAssignmentObject(pureStaff), false);

    assert.equal(isAssignmentObject(shiftAssignment), true);
    assert.equal(isStaffObject(shiftAssignment), false);
  });

  it('getStaffId extracts correct staff UUID from pure Staff object', () => {
    const pureStaff = {
      id: staffUserId,
      fullName: 'Alice Nguyen',
      email: 'alice@shiftsync.com',
    };
    assert.equal(getStaffId(pureStaff), staffUserId);
    assert.equal(getAssignmentId(pureStaff), null);
  });

  it('getStaffId extracts staffId from ShiftAssignmentDTO without using assignment id', () => {
    const shiftAssignment = {
      id: assignmentId, // This is assignment ID!
      staffId: staffUserId, // This is staff ID!
      shiftId: 'shift-99',
    };
    assert.equal(getStaffId(shiftAssignment), staffUserId);
    assert.notEqual(getStaffId(shiftAssignment), assignmentId);
    assert.equal(getAssignmentId(shiftAssignment), assignmentId);
  });

  it('getStaffId handles primitive ID strings directly', () => {
    assert.equal(getStaffId(staffUserId), staffUserId);
    assert.equal(getStaffId(''), null);
    assert.equal(getStaffId(null), null);
    assert.equal(getStaffId(undefined), null);
  });

  it('getStaffId traverses Three.js Avatar Mesh userData', () => {
    const avatarMesh = {
      userData: {
        employee: {
          id: assignmentId,
          staffId: staffUserId,
          staffName: 'Alice',
        },
      },
    };
    assert.equal(getStaffId(avatarMesh), staffUserId);
    assert.equal(getAssignmentId(avatarMesh), assignmentId);
  });

  it('getStaffId returns null when given invalid or empty objects', () => {
    assert.equal(getStaffId({}), null);
    assert.equal(getStaffId({ irrelevant: true }), null);
    assert.equal(getStaffId({ staffId: null, id: null }), null);
    assert.equal(getStaffId({ staffId: '', id: '' }), null);
  });

  it('areSameStaff correctly matches pure Staff with Assignment object', () => {
    const pureStaff = { id: staffUserId, fullName: 'Bob' };
    const assignment = { id: assignmentId, staffId: staffUserId };
    const otherStaff = { id: 'other-uuid', fullName: 'Charlie' };

    assert.equal(areSameStaff(pureStaff, assignment), true);
    assert.equal(areSameStaff(assignment, pureStaff), true);
    assert.equal(areSameStaff(pureStaff, staffUserId), true);
    assert.equal(areSameStaff(pureStaff, otherStaff), false);
    assert.equal(areSameStaff(assignment, otherStaff), false);
    assert.equal(areSameStaff(null, pureStaff), false);
  });

  it('areSameAssignment compares assignment IDs without confusing staff IDs', () => {
    const assign1 = { id: assignmentId, staffId: staffUserId };
    const assign2 = { id: assignmentId, staffId: 'different-user' };
    const assign3 = { id: 'different-assignment', staffId: staffUserId };

    assert.equal(areSameAssignment(assign1, assign2), true);
    assert.equal(areSameAssignment(assign1, assign3), false);
  });
});
