function memberDisplayName(member) {
  return String(member.nickname || member.displayName || member.user?.globalName || member.user?.username || '').trim()
}

function membersForRole(members, roleId) {
  const values = members instanceof Map || members instanceof Set
    ? [...members.values()]
    : Array.isArray(members) ? members : Object.values(members || {})

  return values
    .filter(member => member?.user && !member.user.bot && member.roles?.cache?.has(roleId))
    .sort((a, b) => memberDisplayName(a).localeCompare(memberDisplayName(b), undefined, { sensitivity: 'base' }))
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function playerCsv(members) {
  const rows = [
    ['name', 'team', 'country', 'discord_id'],
    ...members.map(member => [memberDisplayName(member), '', '', member.id]),
  ]
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

module.exports = { memberDisplayName, membersForRole, csvCell, playerCsv }
