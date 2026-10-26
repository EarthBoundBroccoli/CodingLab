import assert from 'node:assert/strict';
import test from 'node:test';
import { SupportTicket } from '../models/SupportTicket.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { createTicket, getMyTickets, getAllTickets, replyToTicket } from '../controllers/supportController.js';

const response = () => ({
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; }
});

test('createTicket creates a new pending support ticket for authenticated user', async t => {
    t.mock.method(SupportTicket, 'create', async data => {
        assert.equal(data.userId, 'user-123');
        assert.equal(data.subject, 'Help with compiler');
        assert.equal(data.message, 'I am getting strange CE on code execution');
        assert.ok(data.status === 'Open' || data.status === 'Pending');
        assert.equal(data.adminReply, '');
        return { _id: 'ticket-999', ...data };
    });

    const res = response();
    await createTicket({
        user: { id: 'user-123' },
        body: { subject: ' Help with compiler ', message: ' I am getting strange CE on code execution ' }
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.ticket._id, 'ticket-999');
});

test('createTicket requires subject and message', async () => {
    const res1 = response();
    await createTicket({ user: { id: 'user-123' }, body: { subject: '', message: 'hi' } }, res1);
    assert.equal(res1.statusCode, 400);

    const res2 = response();
    await createTicket({ user: { id: 'user-123' }, body: { subject: 'hi', message: '' } }, res2);
    assert.equal(res2.statusCode, 400);
});

test('getMyTickets retrieves tickets for the current user', async t => {
    t.mock.method(SupportTicket, 'find', filter => {
        assert.equal(filter.userId, 'user-123');
        return {
            sort: () => [{ _id: 't1', userId: 'user-123', subject: 'Query 1' }]
        };
    });

    const res = response();
    await getMyTickets({ user: { id: 'user-123' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].subject, 'Query 1');
});

test('getAllTickets retrieves all tickets populated with name and email', async t => {
    const mockTickets = [
        {
            _id: 'ticket-1',
            userId: { _id: 'u1', name: 'Alice', email: 'alice@example.com' },
            subject: 'Login bug',
            status: 'Pending'
        }
    ];

    t.mock.method(SupportTicket, 'find', () => ({
        sort: () => ({
            populate: () => mockTickets
        })
    }));

    const res = response();
    await getAllTickets({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].userId.name, 'Alice');
});

test('replyToTicket updates adminReply, marks Resolved, and dispatches notification', async t => {
    let saved = false;
    let notificationCreated = false;

    const mockTicket = {
        _id: '507f1f77bcf86cd799439011',
        userId: 'user-123',
        subject: 'Compiler issue',
        status: 'Pending',
        adminReply: '',
        save: async () => { saved = true; }
    };

    t.mock.method(SupportTicket, 'findById', async id => {
        assert.equal(id, '507f1f77bcf86cd799439011');
        return mockTicket;
    });

    t.mock.method(Notification, 'create', async notif => {
        assert.equal(notif.userId, 'user-123');
        assert.equal(notif.message, 'Admin replied to your support ticket');
        assert.equal(notif.note, 'We fixed the compiler configuration.');
        notificationCreated = true;
    });

    const res = response();
    await replyToTicket({
        params: { id: '507f1f77bcf86cd799439011' },
        body: { adminReply: ' We fixed the compiler configuration. ' }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(saved, true);
    assert.equal(mockTicket.status, 'Resolved');
    assert.equal(mockTicket.adminReply, 'We fixed the compiler configuration.');
    assert.equal(notificationCreated, true);
});
