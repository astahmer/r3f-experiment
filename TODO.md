-   [x] double jump
-   [x] fly
-   [x] trampoline
-   [ ] launchpad (trampoline incliné qui projette en avant en + de la projection en hauteur)
-   [ ] slam (reverse jump)
-   [ ] bouncy walls
-   [ ] slow time
-   [ ] ghost
-   [ ] reverse directions controls malus
-   [x] inverse gravity
-   [ ] inverse gravity in rooms (with collider)
-   [ ] moving walls
-   [ ] attraction point (gravity towards sphere) https://github.com/pmndrs/cannon-es/issues/100
-   [ ] portals
-   [ ] teleport point like tf2 after a few seconds or onClick
-   [ ] doors
-   [ ] plank bridge

-   display information on current position of object / current relative position (PackContext)

17:15/0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1,1,1,1,1,0,0,1,0,0,0,1,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0,0,0,1,1,1,1,1,1,0,0,1,0,0,1,1,1,1,0,1,0,1,0,1,1,1,0,0,0,0,1,0,0,1,1,1,1,0,1,0,1,1,0,0,1,1,0,1,1,0,1,0,1,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,0,0,0,1,0,0,1,1,1,0,1,1,0,1,1,1,1,1,1,0,0,0,1,0,0,0,1,1,1,0,0,1,0,1,0,0,0,1,1,1,0,0,0,0,1,1,1,0,1,0,0,1,1,0,1,1,1,1,1,1,0,1,1,1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,1,0,0,1,0,0,0,0,0,1,1,0,1,1,0,1,0,0,1,1,1,1,1,1,1,0,1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0

<!-- max = 44 = 3.4 -> 4/4 -> ....... -> 9/1 -> 9/2 -->

11:11/0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,1,0,0,0,0,1,0,0,1,0,0,1,1,0,1,1,1,1,1,0,0,0,0,1,1,1,0,0,0,1,0,0,0,0,1,0,0,1,1,0,1,0,0,0,0,1,0,1,0,1,0,1,0,0,0,1,1,1,0,0,1,1,1,1,0,0,1,0,1,1,1,1,0,0,1,0,0,1,1,1,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0

-   branchCells of branCells ?
-   Maze from nested branchCells ?

// return;

                        // TOOD plutôt que de concatener les chemins complets (chaque étape)
                        // essayer de noter dans un array branchSteps les branchCells par lesquelles on est passé
                        // -> plutôt que d'avoir [1/1, 1/2, 1/3, 2/3]
                        // -> avoir [1/1, 2/3]
                        // et ensuite juste check qu'on est pas déjà passé 2x sur la même branchCell

                        // TODO rm branchCells next to another untill none are close to any other ?
                        // TODO for each longestPath, add the only possible subPath remaining that endsWith the 1st step of that longestPath
                        // TODO re-use parts of already computed subPaths rather than recomputing it recursively h24
