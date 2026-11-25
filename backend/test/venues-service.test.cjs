const assert = require('node:assert/strict');
const { test } = require('node:test');
const { VenuesService } = require('../dist/venues/venues.service.js');

function createPrisma(overrides = {}) {
  const prisma = {
    venue: {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      create: async ({ data }) => data,
      update: async ({ data }) => data,
    },
    court: {
      findUnique: async () => null,
      create: async ({ data }) => data,
      update: async ({ data }) => data,
      updateMany: async () => ({ count: 0 }),
    },
    user: {
      findUnique: async () => null,
      findMany: async () => [],
      update: async ({ data }) => data,
    },
    venueOpeningHour: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async () => ({ count: 0 }),
    },
    courtPriceRule: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async ({ data }) => data,
      update: async ({ data }) => data,
      delete: async ({ where }) => where,
    },
    courtMaintenance: {
      findFirst: async () => null,
      findUnique: async () => null,
      findMany: async () => [],
      create: async ({ data }) => data,
      delete: async ({ where }) => where,
    },
    booking: { findFirst: async () => null },
  };
  for (const [model, methods] of Object.entries(overrides)) {
    if (model === '$transaction') {
      continue;
    }
    Object.assign(prisma[model], methods);
  }
  prisma.$transaction =
    overrides.$transaction ?? (async (operation) => operation(prisma));
  return prisma;
}

const ownerUser = { id: 'owner-1', role: 'OWNER' };
const approvedOwner = { role: 'OWNER', ownerApprovalStatus: 'APPROVED' };

test('public venue search combines text and sport filters', async () => {
  let query;
  const service = new VenuesService(
    createPrisma({
      venue: {
        findMany: async (args) => {
          query = args;
          return [];
        },
      },
    }),
  );
  await service.listPublic({ q: 'Center', sport: 'Tennis' });
  assert.equal(query.where.AND.length, 2);
  assert.equal(query.where.AND[0].OR[0].name.contains, 'Center');
  assert.equal(query.where.AND[1].OR[0].sportTypes.has, 'Tennis');
});

test('public venue lookup returns not found for unapproved venues', async () => {
  const service = new VenuesService(createPrisma());
  await assert.rejects(service.getPublicVenue('hidden'), /Venue not found/);
});

test('approved owners can create venues with normalized sports and hours', async () => {
  let created;
  const service = new VenuesService(
    createPrisma({
      user: { findUnique: async () => approvedOwner },
      venue: {
        create: async (args) => {
          created = args.data;
          return args.data;
        },
      },
    }),
  );
  await service.createVenue(ownerUser, {
    name: '  Central Courts ',
    address: '  Main Road ',
    sportTypes: [' Tennis ', 'Tennis'],
    openingHours: [{ dayOfWeek: 1, openTime: '06:00', closeTime: '22:00' }],
  });
  assert.equal(created.name, 'Central Courts');
  assert.deepEqual(created.sportTypes, ['Tennis']);
  assert.equal(created.openingHours.create[0].dayOfWeek, 1);
});

test('pending owners cannot create venues', async () => {
  const service = new VenuesService(
    createPrisma({
      user: {
        findUnique: async () => ({
          ...approvedOwner,
          ownerApprovalStatus: 'PENDING',
        }),
      },
    }),
  );
  await assert.rejects(
    service.createVenue(ownerUser, { name: 'Place', address: 'Address' }),
    /must be approved/,
  );
});

test('venue update transaction replaces opening hours atomically', async () => {
  const calls = [];
  const prisma = createPrisma({
    venue: {
      findUnique: async () => ({ id: 'venue-1', ownerId: ownerUser.id }),
    },
    user: { findUnique: async () => approvedOwner },
    venueOpeningHour: {
      deleteMany: async () => {
        calls.push('delete');
        return { count: 1 };
      },
      createMany: async ({ data }) => {
        calls.push(data);
        return { count: data.length };
      },
    },
    venue: {
      findUnique: async () => ({ id: 'venue-1', ownerId: ownerUser.id }),
      update: async ({ data }) => data,
    },
  });
  const service = new VenuesService(prisma);
  await service.updateVenue('venue-1', ownerUser, {
    name: 'Updated',
    openingHours: [{ dayOfWeek: 2, openTime: '07:00', closeTime: '21:00' }],
  });
  assert.equal(calls[0], 'delete');
  assert.equal(calls[1][0].venueId, 'venue-1');
});

test('venue deactivation also deactivates child courts', async () => {
  const calls = [];
  const service = new VenuesService(
    createPrisma({
      venue: {
        findUnique: async () => ({ id: 'venue-1', ownerId: ownerUser.id }),
        update: async ({ data }) => data,
      },
      user: { findUnique: async () => approvedOwner },
      court: {
        updateMany: async (args) => {
          calls.push(args);
          return { count: 2 };
        },
      },
    }),
  );
  await service.deactivateVenue('venue-1', ownerUser);
  assert.deepEqual(calls[0], {
    where: { venueId: 'venue-1' },
    data: { isActive: false },
  });
});

test('court creation requires venue ownership and approval', async () => {
  let courtData;
  const service = new VenuesService(
    createPrisma({
      venue: {
        findUnique: async () => ({ id: 'venue-1', ownerId: ownerUser.id }),
      },
      user: { findUnique: async () => approvedOwner },
      court: {
        create: async ({ data }) => {
          courtData = data;
          return data;
        },
      },
    }),
  );
  await service.createCourt('venue-1', ownerUser, {
    name: 'Court A',
    sportType: 'Tennis',
  });
  assert.equal(courtData.venueId, 'venue-1');
});

test('court updates reject a different venue owner', async () => {
  const service = new VenuesService(
    createPrisma({
      court: {
        findUnique: async () => ({
          id: 'court-1',
          venue: { ownerId: 'someone-else' },
        }),
      },
      user: { findUnique: async () => approvedOwner },
    }),
  );
  await assert.rejects(
    service.updateCourt('court-1', ownerUser, { name: 'Changed' }),
    /only manage your own/,
  );
});

test('price creation rejects overlapping rules before insertion', async () => {
  let inserted = false;
  const service = new VenuesService(
    createPrisma({
      court: {
        findUnique: async () => ({
          id: 'court-1',
          venue: { ownerId: ownerUser.id },
        }),
      },
      user: { findUnique: async () => approvedOwner },
      courtPriceRule: {
        findMany: async () => [
          { id: 'old', dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
        ],
        create: async () => {
          inserted = true;
        },
      },
    }),
  );
  await assert.rejects(
    service.createPriceRule('court-1', ownerUser, {
      name: 'Peak',
      dayOfWeek: 1,
      startTime: '11:00',
      endTime: '14:00',
      pricePerHour: 100000,
    }),
    /cannot overlap/,
  );
  assert.equal(inserted, false);
});

test('maintenance is rejected when it overlaps an active booking', async () => {
  const service = new VenuesService(
    createPrisma({
      court: {
        findUnique: async () => ({
          id: 'court-1',
          venue: { ownerId: ownerUser.id },
        }),
      },
      user: { findUnique: async () => approvedOwner },
      booking: { findFirst: async () => ({ id: 'booking-1' }) },
    }),
  );
  await assert.rejects(
    service.createMaintenance('court-1', ownerUser, {
      startAt: '2026-01-01T10:00:00Z',
      endAt: '2026-01-01T12:00:00Z',
      reason: 'Repair',
    }),
    /cannot overlap an active booking/,
  );
});

test('maintenance creation checks conflicts and creates in a serializable transaction', async () => {
  let transactionOptions;
  let created;
  const prisma = createPrisma({
    court: {
      findUnique: async () => ({
        id: 'court-1',
        venue: { ownerId: ownerUser.id },
      }),
    },
    user: { findUnique: async () => approvedOwner },
    courtMaintenance: {
      create: async ({ data }) => {
        created = data;
        return data;
      },
    },
    $transaction: async (operation, options) => {
      transactionOptions = options;
      return operation(prisma);
    },
  });
  const service = new VenuesService(prisma);
  await service.createMaintenance('court-1', ownerUser, {
    startAt: '2026-01-01T10:00:00Z',
    endAt: '2026-01-01T12:00:00Z',
    reason: 'Repair',
  });
  assert.equal(transactionOptions.isolationLevel, 'Serializable');
  assert.equal(created.courtId, 'court-1');
});

test('admin can approve an owner application', async () => {
  const service = new VenuesService(
    createPrisma({
      user: {
        findUnique: async () => ({ role: 'OWNER' }),
        update: async ({ data }) => data,
      },
    }),
  );
  const result = await service.reviewOwner('owner-1', 'admin-1', {
    status: 'APPROVED',
  });
  assert.equal(result.ownerApprovalStatus, 'APPROVED');
  assert.equal(result.ownerReviewedById, 'admin-1');
});

test('owner review rejects non-owner accounts', async () => {
  const service = new VenuesService(
    createPrisma({
      user: { findUnique: async () => ({ role: 'CUSTOMER' }) },
    }),
  );
  await assert.rejects(
    service.reviewOwner('customer-1', 'admin-1', { status: 'APPROVED' }),
    /Owner account not found/,
  );
});
