param(
    [switch]$Live,
    [int]$Limit = 0
)

$argsList = @(".\\scripts\\sell-cards.mjs")

if ($Live) {
    $argsList += "--live"
} else {
    $argsList += "--dry-run"
}

if ($Limit -gt 0) {
    $argsList += "--limit"
    $argsList += $Limit
}

node @argsList
