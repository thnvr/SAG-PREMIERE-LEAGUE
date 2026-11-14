/**
 * SAG PREMIERE LEAGUE - Complete Google Apps Script Backend (Code.gs)
 * 
 * Supports:
 * - doGet(?action=getFullState) -> returns { liveState, teams, players, chatMessages }
 * - doPost:
 *    - placeBid
 *    - pushPlayer / nominatePlayer
 *    - markSold
 *    - markUnsold
 *    - updateTeamPurse / fixTeamPurse
 *    - kickPlayer (refunds purse to team and resets player status)
 *    - addPlayer / registerPlayer
 *    - addTeam
 *    - syncAllPlayers (bulk upload all website players)
 *    - syncAllTeams (bulk upload teams)
 *    - sendChatMessage
 *    - resetAuction
 */

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#ffd000");
    }
  }
  return sheet;
}

function initSheets() {
  getOrCreateSheet("LiveState", ["playerId", "playerName", "currentBid", "leadingTeamId", "highestBidder", "status", "updatedAt"]);
  getOrCreateSheet("Teams", ["id", "name", "short_name", "total_purse", "remaining_purse", "max_squad", "color", "captain_name"]);
  getOrCreateSheet("Players", ["id", "name", "position", "base_price", "status", "team_id", "sold_price", "overall_rating", "photo_url"]);
  getOrCreateSheet("Chat", ["id", "name", "message", "reaction", "timestamp"]);
}

function doGet(e) {
  initSheets();
  var action = (e && e.parameter && e.parameter.action) || 'getFullState';
  
  if (action === 'getFullState') {
    return ContentService.createTextOutput(JSON.stringify(getFullStateInternal()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Unknown GET action: " + action }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFullStateInternal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. LiveState
  var liveSheet = ss.getSheetByName("LiveState");
  var liveState = {
    playerId: "",
    playerName: "",
    currentBid: 0,
    leadingTeamId: "",
    highestBidder: "No Bids Yet",
    status: "idle",
    updatedAt: new Date().toISOString()
  };
  if (liveSheet && liveSheet.getLastRow() >= 2) {
    var row = liveSheet.getRange(2, 1, 1, 7).getValues()[0];
    liveState = {
      playerId: String(row[0] || ""),
      playerName: String(row[1] || ""),
      currentBid: Number(row[2] || 0),
      leadingTeamId: String(row[3] || ""),
      highestBidder: String(row[4] || "No Bids Yet"),
      status: String(row[5] || "idle"),
      updatedAt: String(row[6] || new Date().toISOString())
    };
  }
  
  // 2. Teams
  var teamSheet = ss.getSheetByName("Teams");
  var teams = [];
  if (teamSheet && teamSheet.getLastRow() >= 2) {
    var tData = teamSheet.getRange(2, 1, teamSheet.getLastRow() - 1, 8).getValues();
    for (var i = 0; i < tData.length; i++) {
      var r = tData[i];
      if (!r[0]) continue;
      teams.push({
        id: String(r[0]),
        name: String(r[1]),
        short_name: String(r[2]),
        total_purse: Number(r[3] || 0),
        remaining_purse: Number(r[4] || 0),
        max_squad: Number(r[5] || 15),
        color: String(r[6] || "#ffd000"),
        captain_name: String(r[7] || "")
      });
    }
  }
  
  // 3. Players
  var playerSheet = ss.getSheetByName("Players");
  var players = [];
  if (playerSheet && playerSheet.getLastRow() >= 2) {
    var pData = playerSheet.getRange(2, 1, playerSheet.getLastRow() - 1, 9).getValues();
    for (var j = 0; j < pData.length; j++) {
      var pr = pData[j];
      if (!pr[0]) continue;
      players.push({
        id: String(pr[0]),
        name: String(pr[1]),
        position: String(pr[2] || "ST"),
        base_price: Number(pr[3] || 50000),
        status: String(pr[4] || "AVAILABLE"),
        team_id: String(pr[5] || ""),
        sold_price: pr[6] !== "" ? Number(pr[6]) : "",
        overall_rating: pr[7] !== "" ? Number(pr[7]) : 75,
        photo_url: String(pr[8] || "")
      });
    }
  }
  
  // 4. Chat Messages
  var chatSheet = ss.getSheetByName("Chat");
  var chatMessages = [];
  if (chatSheet && chatSheet.getLastRow() >= 2) {
    var cData = chatSheet.getRange(Math.max(2, chatSheet.getLastRow() - 25), 1, Math.min(25, chatSheet.getLastRow() - 1), 5).getValues();
    for (var k = 0; k < cData.length; k++) {
      var cr = cData[k];
      if (!cr[1] && !cr[2]) continue;
      chatMessages.push({
        id: String(cr[0] || k),
        name: String(cr[1] || "Fan"),
        message: String(cr[2] || ""),
        reaction: String(cr[3] || ""),
        timestamp: String(cr[4] || "")
      });
    }
  }
  
  return {
    liveState: liveState,
    teams: teams,
    players: players,
    chatMessages: chatMessages
  };
}

function doPost(e) {
  initSheets();
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "placeBid") {
      var liveSheet = ss.getSheetByName("LiveState");
      var teamId = data.teamId || data.team_id || "";
      var teamName = data.teamName || data.team_name || "Leading Team";
      var amount = Number(data.bidAmount || data.amount || 0);
      var curRow = liveSheet.getRange(2, 1, 1, 7).getValues()[0];
      
      liveSheet.getRange(2, 1, 1, 7).setValues([[
        curRow[0] || "",
        curRow[1] || "",
        amount,
        teamId,
        teamName,
        "active",
        new Date().toISOString()
      ]]);
      return jsonSuccess({ action: "placeBid", teamId: teamId, amount: amount });
    }
    
    if (action === "pushPlayer" || action === "nominatePlayer") {
      var liveSheet = ss.getSheetByName("LiveState");
      var p = data.player || {};
      var basePrice = Number(p.base_price || p.basePrice || 50000);
      
      liveSheet.getRange(2, 1, 1, 7).setValues([[
        p.id || "",
        p.name || "",
        basePrice,
        "",
        "No Bids Yet",
        "active",
        new Date().toISOString()
      ]]);
      return jsonSuccess({ action: "pushPlayer", playerId: p.id, name: p.name });
    }
    
    if (action === "markSold") {
      var liveSheet = ss.getSheetByName("LiveState");
      var winTeamId = data.winningTeamId || data.teamId || "";
      var finalAmt = Number(data.finalAmount || data.amount || 0);
      var curLive = liveSheet.getRange(2, 1, 1, 7).getValues()[0];
      var pId = data.playerId || curLive[0];
      
      liveSheet.getRange(2, 1, 1, 7).setValues([[
        curLive[0] || "",
        curLive[1] || "",
        finalAmt,
        winTeamId,
        curLive[4] || "",
        "sold",
        new Date().toISOString()
      ]]);
      
      // Update Player row to SOLD
      var playerSheet = ss.getSheetByName("Players");
      if (playerSheet && playerSheet.getLastRow() >= 2) {
        var pData = playerSheet.getRange(2, 1, playerSheet.getLastRow() - 1, 7).getValues();
        for (var i = 0; i < pData.length; i++) {
          if (String(pData[i][0]) === String(pId)) {
            playerSheet.getRange(i + 2, 5, 1, 3).setValues([["SOLD", winTeamId, finalAmt]]);
            break;
          }
        }
      }
      
      // Deduct from Team remaining_purse
      var teamSheet = ss.getSheetByName("Teams");
      if (teamSheet && teamSheet.getLastRow() >= 2) {
        var tData = teamSheet.getRange(2, 1, teamSheet.getLastRow() - 1, 5).getValues();
        for (var j = 0; j < tData.length; j++) {
          if (String(tData[j][0]) === String(winTeamId)) {
            var curRem = Number(tData[j][4] || tData[j][3] || 0);
            var newRem = Math.max(0, curRem - finalAmt);
            teamSheet.getRange(j + 2, 5).setValue(newRem);
            break;
          }
        }
      }
      return jsonSuccess({ action: "markSold", playerId: pId, teamId: winTeamId, amount: finalAmt });
    }
    
    if (action === "markUnsold") {
      var liveSheet = ss.getSheetByName("LiveState");
      var curLive = liveSheet.getRange(2, 1, 1, 7).getValues()[0];
      var pId = data.playerId || curLive[0];
      
      liveSheet.getRange(2, 1, 1, 7).setValues([[
        curLive[0] || "",
        curLive[1] || "",
        curLive[2] || 0,
        "",
        "No Bids Yet",
        "unsold",
        new Date().toISOString()
      ]]);
      
      var playerSheet = ss.getSheetByName("Players");
      if (playerSheet && playerSheet.getLastRow() >= 2) {
        var pData = playerSheet.getRange(2, 1, playerSheet.getLastRow() - 1, 5).getValues();
        for (var i = 0; i < pData.length; i++) {
          if (String(pData[i][0]) === String(pId)) {
            playerSheet.getRange(i + 2, 5).setValue("UNSOLD");
            break;
          }
        }
      }
      return jsonSuccess({ action: "markUnsold", playerId: pId });
    }
    
    if (action === "updateTeamPurse" || action === "fixTeamPurse") {
      var teamSheet = ss.getSheetByName("Teams");
      var teamId = data.teamId;
      var newTotal = Number(data.newTotalPurse || data.total_purse || 0);
      var newRem = data.newRemainingPurse != null ? Number(data.newRemainingPurse) : newTotal;
      
      if (teamSheet && teamSheet.getLastRow() >= 2) {
        var tData = teamSheet.getRange(2, 1, teamSheet.getLastRow() - 1, 5).getValues();
        for (var i = 0; i < tData.length; i++) {
          if (String(tData[i][0]) === String(teamId)) {
            teamSheet.getRange(i + 2, 4, 1, 2).setValues([[newTotal, newRem]]);
            return jsonSuccess({ action: "updateTeamPurse", teamId: teamId, total: newTotal, remaining: newRem });
          }
        }
      }
      return jsonSuccess({ action: "updateTeamPurse", status: "team_not_found" });
    }
    
    if (action === "kickPlayer") {
      var playerId = data.playerId;
      var targetTeamId = data.teamId;
      var playerSheet = ss.getSheetByName("Players");
      var teamSheet = ss.getSheetByName("Teams");
      var refundPrice = 0;
      
      if (playerSheet && playerSheet.getLastRow() >= 2) {
        var pData = playerSheet.getRange(2, 1, playerSheet.getLastRow() - 1, 7).getValues();
        for (var i = 0; i < pData.length; i++) {
          if (String(pData[i][0]) === String(playerId)) {
            if (!targetTeamId) targetTeamId = String(pData[i][5]);
            refundPrice = Number(pData[i][6] || 0);
            playerSheet.getRange(i + 2, 5, 1, 3).setValues([["AVAILABLE", "", ""]]);
            break;
          }
        }
      }
      
      if (targetTeamId && refundPrice > 0 && teamSheet && teamSheet.getLastRow() >= 2) {
        var tData = teamSheet.getRange(2, 1, teamSheet.getLastRow() - 1, 5).getValues();
        for (var j = 0; j < tData.length; j++) {
          if (String(tData[j][0]) === String(targetTeamId)) {
            var curTotal = Number(tData[j][3] || 0);
            var curRem = Number(tData[j][4] || 0);
            var updatedRem = Math.min(curTotal, curRem + refundPrice);
            teamSheet.getRange(j + 2, 5).setValue(updatedRem);
            break;
          }
        }
      }
      return jsonSuccess({ action: "kickPlayer", playerId: playerId, teamId: targetTeamId, refund: refundPrice });
    }
    
    if (action === "addPlayer" || action === "registerPlayer") {
      var p = data.player || data;
      var playerSheet = ss.getSheetByName("Players");
      var newRow = [
        p.id || "p_" + Date.now(),
        p.name || "Player",
        p.position || p.primary_position || "ST",
        Number(p.base_price || p.basePrice || 50000),
        p.status || "AVAILABLE",
        p.team_id || "",
        p.sold_price || "",
        Number(p.overall_rating || 75),
        p.photo_url || ""
      ];
      playerSheet.appendRow(newRow);
      return jsonSuccess({ action: "addPlayer", player: p });
    }
    
    if (action === "addTeam") {
      var t = data.team || data;
      var teamSheet = ss.getSheetByName("Teams");
      var newRow = [
        t.id || "team_" + Date.now(),
        t.name || "Team",
        t.short_name || t.shortName || "TM",
        Number(t.total_purse || t.initial_purse || 200000000),
        Number(t.remaining_purse || t.total_purse || 200000000),
        Number(t.max_squad || 15),
        t.color || t.primary_color || "#ffd000",
        t.captain_name || ""
      ];
      teamSheet.appendRow(newRow);
      return jsonSuccess({ action: "addTeam", team: t });
    }

    if (action === "syncAllPlayers") {
      var playerSheet = ss.getSheetByName("Players");
      var incoming = data.players || [];
      if (incoming.length > 0) {
        // Clear old rows except header
        if (playerSheet.getLastRow() >= 2) {
          playerSheet.deleteRows(2, playerSheet.getLastRow() - 1);
        }
        var rows = incoming.map(function(p) {
          return [
            p.id || ("p_" + Math.random().toString(36).substr(2, 9)),
            p.name || "Player",
            p.position || p.primary_position || "ST",
            Number(p.base_price || p.basePrice || 50000),
            (p.status || "AVAILABLE").toUpperCase(),
            p.team_id || p.sold_to_team_id || "",
            p.sold_price || "",
            Number(p.overall_rating || 75),
            p.photo_url || ""
          ];
        });
        playerSheet.getRange(2, 1, rows.length, 9).setValues(rows);
      }
      return jsonSuccess({ action: "syncAllPlayers", count: incoming.length });
    }

    if (action === "syncAllTeams") {
      var teamSheet = ss.getSheetByName("Teams");
      var incoming = data.teams || [];
      if (incoming.length > 0) {
        if (teamSheet.getLastRow() >= 2) {
          teamSheet.deleteRows(2, teamSheet.getLastRow() - 1);
        }
        var rows = incoming.map(function(t) {
          return [
            t.id || ("team_" + Math.random().toString(36).substr(2, 9)),
            t.name || "Team",
            t.short_name || t.shortName || "TM",
            Number(t.total_purse || 200000000),
            Number(t.remaining_purse || 200000000),
            Number(t.max_squad || 15),
            t.color || t.primary_color || "#ffd000",
            t.captain_name || ""
          ];
        });
        teamSheet.getRange(2, 1, rows.length, 8).setValues(rows);
      }
      return jsonSuccess({ action: "syncAllTeams", count: incoming.length });
    }
    
    if (action === "sendChatMessage") {
      var chatSheet = ss.getSheetByName("Chat");
      chatSheet.appendRow([
        "msg_" + Date.now(),
        data.name || "Fan",
        data.message || "",
        data.reaction || "",
        new Date().toISOString()
      ]);
      return jsonSuccess({ action: "sendChatMessage" });
    }
    
    if (action === "resetAuction") {
      var liveSheet = ss.getSheetByName("LiveState");
      liveSheet.getRange(2, 1, 1, 7).setValues([["", "", 0, "", "No Bids Yet", "idle", new Date().toISOString()]]);
      return jsonSuccess({ action: "resetAuction" });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: "Unknown action: " + action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function jsonSuccess(obj) {
  obj.success = true;
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
