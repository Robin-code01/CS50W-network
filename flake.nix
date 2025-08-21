{
  description = "Django project dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: 
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
      pythonEnv = pkgs.python312.withPackages (ps: with ps; [
        django
        # daphne   # to use ASGI later
      ]);
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = [
          pythonEnv
        ];
      };
    };
}
