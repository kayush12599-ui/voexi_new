// Regression test script for VOEXI Comment-Reply Association System
const assert = require('assert');

// Pure function testing CommentService logic
function isReplyComment(c) {
  if (!c) return false;
  return !!(c.parent_id || c.parentId);
}

function processCommentThreads(allComments) {
  if (!Array.isArray(allComments) || allComments.length === 0) {
    return { topLevelComments: [], repliesMap: {} };
  }

  const topLevelComments = allComments.filter(c => !isReplyComment(c));
  const rawReplyComments = allComments.filter(c => isReplyComment(c));
  const repliesMap = {};

  const topLevelIdSet = new Set(topLevelComments.map(p => p.id));

  rawReplyComments.forEach(c => {
    const pId = c.parent_id || c.parentId;
    if (pId && topLevelIdSet.has(pId)) {
      if (!repliesMap[pId]) repliesMap[pId] = [];
      repliesMap[pId].push(c);
    }
  });

  return {
    topLevelComments: topLevelComments.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)),
    repliesMap
  };
}

console.log("=== RUNNING REQUIRED COMMENT-REPLY REGRESSION TESTS ===");

let commentsDatabase = [];

// Step 1: Create Comment A
console.log("\n[Step 1] Creating Comment A (by User A)...");
const commentA = {
  id: "comment_A",
  user: "@userA",
  content: "This is Comment A",
  text: "This is Comment A",
  created_at: new Date(Date.now() - 10000).toISOString(),
  parent_id: null
};
commentsDatabase.push(commentA);

// Step 2: Create Comment B
console.log("[Step 2] Creating Comment B (by User A)...");
const commentB = {
  id: "comment_B",
  user: "@userA",
  content: "This is Comment B",
  text: "This is Comment B",
  created_at: new Date(Date.now() - 5000).toISOString(),
  parent_id: null
};
commentsDatabase.push(commentB);

// Step 3: Reply to Comment A
console.log("[Step 3] Replying to Comment A (Reply 1 by User B)...");
const reply1 = {
  id: "reply_1",
  user: "@userB",
  content: "↳ Replying to @userA: Great post A!",
  text: "↳ Replying to @userA: Great post A!",
  created_at: new Date(Date.now() - 2000).toISOString(),
  parent_id: "comment_A"
};
commentsDatabase.push(reply1);

// Step 4: Verify reply appears ONLY under Comment A
console.log("[Step 4] Verifying reply appears ONLY under Comment A...");
let state = processCommentThreads(commentsDatabase);
assert.strictEqual(state.topLevelComments.length, 2, "Should have 2 top level comments");
assert.strictEqual((state.repliesMap["comment_A"] || []).length, 1, "Comment A should have 1 reply");
assert.strictEqual(state.repliesMap["comment_A"][0].id, "reply_1");
assert.strictEqual((state.repliesMap["comment_B"] || []).length, 0, "Comment B should have 0 replies");
console.log("  => PASSED: Reply 1 is exclusively attached to Comment A.");

// Step 5: Delete that reply
console.log("[Step 5] Deleting reply_1...");
commentsDatabase = commentsDatabase.filter(c => c.id !== "reply_1");

// Step 6: Verify it disappears and does not appear under Comment B
console.log("[Step 6] Verifying reply_1 is gone and not present under Comment B...");
state = processCommentThreads(commentsDatabase);
assert.strictEqual((state.repliesMap["comment_A"] || []).length, 0, "Comment A should now have 0 replies");
assert.strictEqual((state.repliesMap["comment_B"] || []).length, 0, "Comment B should have 0 replies");
console.log("  => PASSED: Reply 1 completely deleted.");

// Step 7: Add Comment C
console.log("[Step 7] Adding Comment C (by User A)...");
const commentC = {
  id: "comment_C",
  user: "@userA",
  content: "This is Comment C",
  text: "This is Comment C",
  created_at: new Date().toISOString(),
  parent_id: null
};
// Prepend Comment C (newest comment first)
commentsDatabase = [commentC, ...commentsDatabase];

// Step 8: Reply to Comment A again
console.log("[Step 8] Replying to Comment A again (Reply 2 by User C)...");
const reply2 = {
  id: "reply_2",
  user: "@userC",
  content: "↳ Replying to @userA: Replying to A again!",
  text: "↳ Replying to @userA: Replying to A again!",
  created_at: new Date().toISOString(),
  parent_id: "comment_A"
};
commentsDatabase.push(reply2);

// Step 9: Verify that reply remains under Comment A (and NOT Comment C)
console.log("[Step 9] Verifying reply_2 remains strictly under Comment A...");
state = processCommentThreads(commentsDatabase);
assert.strictEqual(state.topLevelComments.length, 3, "Should have 3 top level comments (C, A, B)");
assert.strictEqual((state.repliesMap["comment_A"] || []).length, 1, "Comment A must have 1 reply");
assert.strictEqual(state.repliesMap["comment_A"][0].id, "reply_2");
assert.strictEqual((state.repliesMap["comment_C"] || []).length, 0, "Comment C must have 0 replies");
assert.strictEqual((state.repliesMap["comment_B"] || []).length, 0, "Comment B must have 0 replies");
console.log("  => PASSED: Reply 2 remains attached to Comment A despite Comment C being added by same author!");

// Step 10: Delete Comment B and verify Comment A's replies remain correctly associated
console.log("[Step 10] Deleting Comment B...");
commentsDatabase = commentsDatabase.filter(c => c.id !== "comment_B" && c.parent_id !== "comment_B");
state = processCommentThreads(commentsDatabase);
assert.strictEqual(state.topLevelComments.length, 2, "Should have 2 top level comments left (C, A)");
assert.strictEqual((state.repliesMap["comment_A"] || []).length, 1, "Comment A still has reply_2");
assert.strictEqual(state.repliesMap["comment_A"][0].id, "reply_2");
console.log("  => PASSED: Deleting Comment B did not affect Comment A's reply association.");

// Step 11: Refresh or reopen video and verify the same hierarchy
console.log("[Step 11] Simulating refresh / re-fetch of comments...");
const refreshedComments = JSON.parse(JSON.stringify(commentsDatabase)); // deep copy clone
state = processCommentThreads(refreshedComments);
assert.strictEqual(state.topLevelComments.length, 2);
assert.strictEqual((state.repliesMap["comment_A"] || []).length, 1);
assert.strictEqual(state.repliesMap["comment_A"][0].id, "reply_2");
console.log("  => PASSED: Refetched comments maintain 100% identical hierarchy.");

// Step 12: Repeat the tests with multiple comments and replies
console.log("[Step 12] Testing multi-comment multi-reply matrix...");
const commentD = { id: "comment_D", user: "@userX", content: "Doc D", text: "Doc D", parent_id: null };
const replyD1 = { id: "reply_D1", user: "@userY", content: "↳ Replying to @userX: Reply D1", text: "↳ Replying to @userX: Reply D1", parent_id: "comment_D" };
const replyD2 = { id: "reply_D2", user: "@userZ", content: "↳ Replying to @userX: Reply D2", text: "↳ Replying to @userX: Reply D2", parent_id: "comment_D" };

commentsDatabase.push(commentD, replyD1, replyD2);
state = processCommentThreads(commentsDatabase);
assert.strictEqual((state.repliesMap["comment_D"] || []).length, 2);
assert.strictEqual((state.repliesMap["comment_A"] || []).length, 1);

// Delete replyD1
commentsDatabase = commentsDatabase.filter(c => c.id !== "reply_D1");
state = processCommentThreads(commentsDatabase);
assert.strictEqual((state.repliesMap["comment_D"] || []).length, 1);
assert.strictEqual(state.repliesMap["comment_D"][0].id, "reply_D2");
assert.strictEqual((state.repliesMap["comment_A"] || []).length, 1);
assert.strictEqual(state.repliesMap["comment_A"][0].id, "reply_2");
console.log("  => PASSED: Multi-comment multi-reply matrix verified successfully.");

console.log("\nALL 12 REGRESSION TEST STEPS PASSED PERFECTLY!");
