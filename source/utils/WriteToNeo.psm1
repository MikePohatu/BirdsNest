 Function WriteToNeo {
    Param (
        [Parameter(Mandatory=$true)][string]$NeoConfigPath,
        [Parameter(Mandatory=$true)][string]$serverURL,
        [Parameter(Mandatory=$true)][string]$Query,
        [System.Collections.Generic.IDictionary[[string],[object]]]$Parameters
    )
    $results = $null

    try {
        $neoconfig = Get-Content -Raw -Path $NeoConfigPath | ConvertFrom-Json
        

        $secPasswd = ConvertTo-SecureString $neoconfig.dbPassword -AsPlainText -Force
        $neo4jCreds = New-Object System.Management.Automation.PSCredential ($neoconfig.dbUsername, $secPasswd) 
        $paramsjson = $Parameters | ConvertTo-Json

        # Cypher query using parameters to pass in properties
        $statement = new-object 'system.collections.generic.dictionary[[string],[object]]'
        $statement.Add('statement',$Query)
        $statement.Add('parameters',$Parameters)
        $statements = new-object 'system.collections.generic.list[object]'
        $statements.Add($statement)

        $body = $statement = new-object 'system.collections.generic.dictionary[[string],[object]]'
        $body.Add('statements',$statements)

        $bodyjson = $body | ConvertTo-Json -Depth 5
        #write-host $bodyjson
        
        # Call Neo4J HTTP EndPoint, Pass in creds & POST JSON Payload
        $response = Invoke-WebRequest -DisableKeepAlive -Uri $serverURL -Method POST -Body $bodyjson -credential $neo4jCreds -ContentType "application/json"

    } 
    finally {
      
    }
    return $response
}

#Based on https://github.com/csharpvitamins/CSharpVitamins.ShortGuid
function Get-ShortGuid {   
    $guid = New-Guid
    $Bytes = [System.Text.Encoding]::Unicode.GetBytes($guid)
    $EncodedText =[Convert]::ToBase64String($Bytes)
    $ShortGuid=$EncodedText.Replace('/','_').Replace('+','-').Substring(0, 22)
    $ShortGuid
} 
