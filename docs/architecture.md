# Architecture diagram — Blessing

Part 1 requires a MERN architecture diagram with security features and system boundaries.

Save your exported PNG as `docs/images/architecture-diagram.png`, then add this line to the README:

```markdown
![HustleHub+ Architecture Diagram](docs/images/architecture-diagram.png)
```

You can screenshot the Mermaid diagram below (GitHub also renders it) and tidy it in draw.io if you prefer.

```mermaid
flowchart TB
  subgraph outside [Outside the system boundary]
    Users[Clients Freelancers Admins]
    Devices[Browser devices]
  end

  subgraph hustlehub [HustleHub+ system boundary]
    subgraph later [Later POE parts]
      ReactUI[React frontend]
      Mongo[(MongoDB)]
    end

    subgraph part1 [Part 1 now]
      TLS[HTTPS TLS]
      subgraph api [Node.js Express API]
        Helmet[Helmet headers]
        Validate[Input validation]
        Hash[Password hashing bcrypt]
        JWT[JWT sign and verify]
        Errors[Safe error handler]
        Logs[Event logging]
      end
      Files[(File user store)]
    end
  end

  Users --> Devices
  Devices --> ReactUI
  Devices -->|"Part 1: Postman or HTTPS client"| TLS
  ReactUI -->|"Later parts"| TLS
  TLS --> Helmet --> Validate --> Hash
  Validate --> JWT
  Hash --> Files
  JWT --> Files
  Files -.->|"Later parts"| Mongo
  api --> Errors
  api --> Logs
```

## Must show

- React (later), Express + Node, MongoDB (later)
- HTTPS boundary
- Validation, hashing, JWT, controlled errors
- Part 1 file storage vs later MongoDB
